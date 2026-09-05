"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireSection } from "@/lib/dal";
import { hasSectionAccess } from "@/lib/permissions";
import { isWithinBusinessHours } from "@/lib/businessHours";
import { generateSupportReply } from "@/lib/ai";
import { getSupportContact } from "@/lib/support";
import { getPlatformStats } from "@/lib/platformStats";
import { getAlertEmail, logIssue } from "@/lib/systemHealth";
import { sendMail } from "@/lib/mail";
import {
  startTicketFormSchema,
  ticketMessageFormSchema,
  assignTicketFormSchema,
  ticketStatusFormSchema,
} from "@/lib/schemas";
import type { ActionState } from "@/lib/schemas";

const OUT_OF_HOURS_NOTICE =
  "Thanks for reaching out to EstateFinderHub! We're outside our usual support hours (7am-7pm EAT) " +
  "right now, but an assistant reply is on the way below, and a real team member will follow up " +
  "as soon as we're back online.";

// Shown when both AI providers fail/time out (see runAiFollowUp) -- never
// leave the visitor staring at "typing…" with no explanation.
const NO_AI_REPLY_FALLBACK =
  "Sorry, our assistant is having trouble responding right now. A team member has been notified " +
  "and will reply here shortly.";

// Emails the alert address that a ticket needs a human -- used both when the
// AI explicitly escalates and when it fails to respond at all.
async function alertNeedsHuman(subject: string, lastMessage: string) {
  const to = getAlertEmail();
  if (!to) return;
  const appUrl = (process.env.APP_URL ?? "").replace(/\/+$/, "");
  await sendMail(
    to,
    `[EstateFinderHub] Live chat needs a human: "${subject}"`,
    `<p>A visitor's chat couldn't be resolved by the assistant and needs a team member.</p>
     <p><strong>Subject:</strong> ${subject}</p>
     <p><strong>Last message:</strong> ${lastMessage}</p>
     ${appUrl ? `<p><a href="${appUrl}/?tab=account&atab=admin&section=support">Open the support inbox</a></p>` : ""}`
  );
}

// How long an AI-resolved ticket (see aiResolved in schema.prisma) sits
// around before cleanupResolvedTickets purges it -- long enough for the
// visitor to still be reading the reply or send an immediate follow-up,
// short enough that "resolved" chats genuinely aren't kept.
const RESOLVED_GRACE_MS = 2 * 60 * 1000;

// `id` (a Prisma cuid, k-sortable by creation order) is a secondary sort key
// throughout this file wherever message order matters -- messages created
// in the same nested write (e.g. the first USER message + an out-of-hours
// SYSTEM note) can land on the exact same `createdAt` second on SQLite, so
// `createdAt` alone doesn't reliably say which came first.
const MESSAGE_ORDER = [{ createdAt: "asc" as const }, { id: "asc" as const }];

const TICKET_INCLUDE = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  messages: { orderBy: MESSAGE_ORDER, include: { senderUser: { select: { name: true, email: true } } } },
  assignedTo: { select: { id: true, name: true, email: true } },
} as const;

export type ChatTicket = NonNullable<Awaited<ReturnType<typeof getMyActiveTicket>>>;

// The signed-in user's most recent ticket that isn't closed -- live chat and
// tickets are the same object (see SupportTicket in schema.prisma), so this
// doubles as "what should the chat window show right now".
export async function getMyActiveTicket() {
  const user = await requireUser();
  return prisma.supportTicket.findFirst({
    where: { userId: user.id, status: { not: "CLOSED" } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: TICKET_INCLUDE,
  });
}

function buildAiHistory(messages: { sender: string; body: string }[]) {
  return messages
    .filter((m) => m.sender === "USER" || m.sender === "AI")
    .map((m) => ({ role: m.sender === "USER" ? ("user" as const) : ("assistant" as const), content: m.body }));
}

// Sends a chat message as the signed-in user, creating a ticket first if
// `ticketId` is empty (or points at a CLOSED ticket -- that one's done, this
// starts a fresh thread). Fires the out-of-hours notice (new tickets only)
// and an AI first-line reply (any ticket a human hasn't answered yet) as
// best-effort follow-ups so the user's message is never blocked on either.
export async function sendChatMessage(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  // A transient DB/network hiccup here must not leave the Send button stuck
  // pending forever -- always resolve the action one way or another instead
  // of letting an error propagate uncaught out of a Server Action.
  try {
    const rawTicketId = String(formData.get("ticketId") ?? "");
    const existing = rawTicketId
      ? await prisma.supportTicket.findFirst({ where: { id: rawTicketId, userId: user.id } })
      : null;

    const isNewTicket = !existing || existing.status === "CLOSED";

    if (isNewTicket) {
      const parsed = startTicketFormSchema.safeParse({
        subject: formData.get("subject") || String(formData.get("body") ?? "").slice(0, 60) || "Support request",
        body: formData.get("body"),
      });
      if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

      // Piggybacks the (rare, lightweight) sweep for old AI-resolved
      // tickets onto starting a new chat, rather than running it on every
      // poll -- each round trip to the DB has real latency, so it only
      // runs here.
      after(() => cleanupResolvedTickets());

      // One round trip instead of two: the out-of-hours notice, when
      // needed, is created in the same nested write as the ticket + first
      // message.
      const ticket = await prisma.supportTicket.create({
        data: {
          userId: user.id,
          subject: parsed.data.subject,
          messages: {
            create: [
              { sender: "USER", senderId: user.id, body: parsed.data.body },
              ...(isWithinBusinessHours() ? [] : [{ sender: "SYSTEM" as const, body: OUT_OF_HOURS_NOTICE }]),
            ],
          },
        },
      });

      after(() => runAiFollowUp(ticket.id));
      revalidatePath("/");
      return { success: true };
    }

    const parsed = ticketMessageFormSchema.safeParse({
      ticketId: existing.id,
      body: formData.get("body"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    // One round trip: creates the message and, in the same write, reopens
    // a ticket the user is following up on after a human resolved it
    // (silence would otherwise strand them in a "RESOLVED" thread), and
    // clears aiResolved so a fresh question can't be swept up by
    // cleanupResolvedTickets before the new AI reply has a chance to run.
    await prisma.supportTicket.update({
      where: { id: existing.id },
      data: {
        aiResolved: false,
        ...(existing.status === "RESOLVED" ? { status: "OPEN" } : {}),
        messages: { create: { sender: "USER", senderId: user.id, body: parsed.data.body } },
      },
    });

    after(() => runAiFollowUp(existing.id));
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("sendChatMessage failed", error);
    await logIssue(
      "ERROR",
      "support-chat",
      "sendChatMessage failed",
      error instanceof Error ? (error.stack ?? error.message) : String(error)
    );
    return { error: "Couldn't send that -- please try again." };
  }
}

// Deletes the visitor's own current chat the moment they close the widget,
// unless it still needs a human (needsHuman -- see runAiFollowUp/
// staffReplyToTicket/assignTicket) or the last message is still awaiting a
// reply (closing right after sending shouldn't race the in-flight AI turn
// that might still need to escalate it). cleanupResolvedTickets remains as
// a fallback for sessions that end without an explicit close (tab closed,
// navigated away).
export async function closeChatSession(): Promise<void> {
  const user = await requireUser();
  const ticket = await prisma.supportTicket.findFirst({
    where: { userId: user.id, status: { not: "CLOSED" } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 } },
  });
  if (!ticket || ticket.needsHuman) return;

  const lastMessage = ticket.messages[0];
  const awaitingReply = !lastMessage || lastMessage.sender === "USER";
  if (awaitingReply) return;

  await prisma.supportTicket.delete({ where: { id: ticket.id } });
  revalidatePath("/");
}

// Only chimes in while no human has answered yet -- once STAFF has replied,
// this stops auto-replying so the AI doesn't talk over an actual agent.
// Runs entirely in the background (via `after()`), so a failure here must
// never throw uncaught -- there's no request left to catch it.
async function runAiFollowUp(ticketId: string) {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { messages: { orderBy: MESSAGE_ORDER } },
    });
    if (!ticket || ticket.messages.some((m) => m.sender === "STAFF")) return;

    const isFirstAiReply = !ticket.messages.some((m) => m.sender === "AI");
    const [contact, stats] = await Promise.all([getSupportContact(), getPlatformStats()]);
    const reply = await generateSupportReply(buildAiHistory(ticket.messages), { contact, stats });

    if (!reply) {
      // Both providers failed/timed out -- the visitor must never be left
      // staring at "typing…" forever just because the AI had a bad moment.
      // Hand off to a human explicitly instead of going silent.
      await prisma.supportMessage.create({
        data: { ticketId, sender: "SYSTEM", body: NO_AI_REPLY_FALLBACK, outcome: "clarify" },
      });
      await prisma.supportTicket.update({ where: { id: ticketId }, data: { needsHuman: true } });
      if (isFirstAiReply) await alertNeedsHuman(ticket.subject, "(assistant unavailable)");
      revalidatePath("/");
      return;
    }

    await prisma.supportMessage.create({
      data: {
        ticketId,
        sender: "AI",
        body: reply.text,
        outcome: reply.status === "RESOLVED" ? "answered" : "clarify",
      },
    });
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        aiResolved: reply.status === "RESOLVED",
        needsHuman: reply.status === "ESCALATE" ? true : undefined,
      },
    });

    // Only on the ticket's first AI turn -- a ticket that's still open and
    // unescalated by staff several messages in would otherwise re-alert on
    // every single reply.
    if (reply.status === "ESCALATE" && isFirstAiReply) {
      await alertNeedsHuman(ticket.subject, ticket.messages[ticket.messages.length - 1]?.body ?? "");
    }

    revalidatePath("/");
  } catch (error) {
    console.error("runAiFollowUp failed", error);
    await logIssue(
      "ERROR",
      "support-chat",
      "runAiFollowUp failed",
      error instanceof Error ? (error.stack ?? error.message) : String(error)
    );
  }
}

// Deletes AI-resolved tickets (see aiResolved) once they've sat untouched
// past the grace window -- "resolved" chats are genuinely not kept.
// Anything that ever needed a human (needsHuman) is untouched here
// regardless of age. Cascades to delete its SupportMessage rows too.
async function cleanupResolvedTickets() {
  await prisma.supportTicket.deleteMany({
    where: { aiResolved: true, needsHuman: false, updatedAt: { lt: new Date(Date.now() - RESOLVED_GRACE_MS) } },
  });
}

// --- Staff-side (requires the "support" delegated duty, or full ADMIN) ---

export async function staffReplyToTicket(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireSection("support");

  try {
    const parsed = ticketMessageFormSchema.safeParse({
      ticketId: formData.get("ticketId"),
      body: formData.get("body"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const ticket = await prisma.supportTicket.findUnique({ where: { id: parsed.data.ticketId } });
    if (!ticket) return { error: "Ticket not found." };

    await prisma.supportMessage.create({
      data: { ticketId: ticket.id, sender: "STAFF", senderId: user.id, body: parsed.data.body },
    });

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status,
        firstStaffReplyAt: ticket.firstStaffReplyAt ?? new Date(),
        // A human just engaged with this ticket -- never let it get swept
        // up by cleanupResolvedTickets, or deleted on chat-close, afterward.
        aiResolved: false,
        needsHuman: true,
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("staffReplyToTicket failed", error);
    await logIssue(
      "ERROR",
      "support-chat",
      "staffReplyToTicket failed",
      error instanceof Error ? (error.stack ?? error.message) : String(error)
    );
    return { error: "Couldn't send that -- please try again." };
  }
}

export async function assignTicket(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireSection("support");

  const parsed = assignTicketFormSchema.safeParse({
    ticketId: formData.get("ticketId"),
    assignedToId: formData.get("assignedToId"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  if (parsed.data.assignedToId) {
    const assignee = await prisma.user.findUnique({
      where: { id: parsed.data.assignedToId },
      include: { customRole: { select: { permissions: true } } },
    });
    if (!assignee || !hasSectionAccess(assignee, "support")) {
      return { error: "Can only assign to staff with support access." };
    }
  }

  await prisma.supportTicket.update({
    where: { id: parsed.data.ticketId },
    // Assigning it to someone is itself a "this needs a human" signal --
    // don't let it vanish before the assignee gets to it.
    data: { assignedToId: parsed.data.assignedToId, needsHuman: parsed.data.assignedToId ? true : undefined },
  });

  revalidatePath("/");
  return { success: true };
}

export async function updateTicketStatus(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireSection("support");

  const parsed = ticketStatusFormSchema.safeParse({
    ticketId: formData.get("ticketId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.supportTicket.update({
    where: { id: parsed.data.ticketId },
    data: {
      status: parsed.data.status,
      resolvedAt: parsed.data.status === "RESOLVED" || parsed.data.status === "CLOSED" ? new Date() : null,
    },
  });

  revalidatePath("/");
  return { success: true };
}

// Used by the staff ticket-detail view to poll for new messages.
export async function getTicketForStaff(ticketId: string) {
  await requireSection("support");
  return prisma.supportTicket.findUnique({ where: { id: ticketId }, include: TICKET_INCLUDE });
}

// Staff assignable to tickets -- anyone with "support" access, so the
// assignment dropdown only ever offers people who can actually see the
// ticket once assigned.
export async function listSupportStaff() {
  await requireSection("support");
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { role: "ADMIN" },
        { permissions: { contains: '"support"' } },
        { customRole: { permissions: { contains: '"support"' } } },
      ],
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return users;
}

"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireSection } from "@/lib/dal";
import { hasSectionAccess } from "@/lib/permissions";
import { isWithinBusinessHours } from "@/lib/businessHours";
import { generateSupportReply } from "@/lib/ai";
import {
  startTicketFormSchema,
  ticketMessageFormSchema,
  assignTicketFormSchema,
  ticketStatusFormSchema,
} from "@/lib/schemas";
import type { ActionState } from "@/lib/schemas";

const OUT_OF_HOURS_NOTICE =
  "Thanks for reaching out to PropertyKE! We're outside our usual support hours (7am-7pm EAT) " +
  "right now, but an assistant reply is on the way below, and a real team member will follow up " +
  "as soon as we're back online.";

const TICKET_INCLUDE = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  messages: { orderBy: { createdAt: "asc" as const }, include: { senderUser: { select: { name: true, email: true } } } },
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
    orderBy: { createdAt: "desc" },
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

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject: parsed.data.subject,
        messages: { create: { sender: "USER", senderId: user.id, body: parsed.data.body } },
      },
    });

    if (!isWithinBusinessHours()) {
      await prisma.supportMessage.create({
        data: { ticketId: ticket.id, sender: "SYSTEM", body: OUT_OF_HOURS_NOTICE },
      });
    }

    after(() => runAiFollowUp(ticket.id));
    revalidatePath("/");
    return { success: true };
  }

  const parsed = ticketMessageFormSchema.safeParse({
    ticketId: existing.id,
    body: formData.get("body"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.supportMessage.create({
    data: { ticketId: existing.id, sender: "USER", senderId: user.id, body: parsed.data.body },
  });
  // A user following back up on a ticket a human already resolved reopens
  // it -- silence would otherwise strand them in a "RESOLVED" thread.
  if (existing.status === "RESOLVED") {
    await prisma.supportTicket.update({ where: { id: existing.id }, data: { status: "OPEN" } });
  }

  after(() => runAiFollowUp(existing.id));
  revalidatePath("/");
  return { success: true };
}

// Only chimes in while no human has answered yet -- once STAFF has replied,
// this stops auto-replying so the AI doesn't talk over an actual agent.
async function runAiFollowUp(ticketId: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket || ticket.messages.some((m) => m.sender === "STAFF")) return;

  const reply = await generateSupportReply(buildAiHistory(ticket.messages));
  if (!reply) return;

  await prisma.supportMessage.create({ data: { ticketId, sender: "AI", body: reply } });
  revalidatePath("/");
}

// --- Staff-side (requires the "support" delegated duty, or full ADMIN) ---

export async function staffReplyToTicket(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireSection("support");

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
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function assignTicket(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireSection("support");

  const parsed = assignTicketFormSchema.safeParse({
    ticketId: formData.get("ticketId"),
    assignedToId: formData.get("assignedToId"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  if (parsed.data.assignedToId) {
    const assignee = await prisma.user.findUnique({ where: { id: parsed.data.assignedToId } });
    if (!assignee || !hasSectionAccess(assignee, "support")) {
      return { error: "Can only assign to staff with support access." };
    }
  }

  await prisma.supportTicket.update({
    where: { id: parsed.data.ticketId },
    data: { assignedToId: parsed.data.assignedToId },
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
    where: { OR: [{ role: "ADMIN" }, { permissions: { contains: '"support"' } }] },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return users;
}

"use client";

import { useEffect, useRef, useState, useActionState, type KeyboardEvent } from "react";
import {
  getTicketForStaff,
  staffReplyToTicket,
  assignTicket,
  updateTicketStatus,
  listSupportStaff,
} from "@/lib/actions/support";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Spinner } from "@/components/ui/Spinner";

type Ticket = Awaited<ReturnType<typeof getTicketForStaff>>;
type StaffOption = Awaited<ReturnType<typeof listSupportStaff>>[number];

const SENDER_LABEL: Record<string, string> = {
  USER: "Customer",
  STAFF: "Staff",
  AI: "AI assistant",
  SYSTEM: "System",
};

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
const POLL_MS = 1500;

export function TicketDetailModal({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const [ticket, setTicket] = useState<Ticket | undefined>(undefined);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [replyState, replyAction] = useActionState(staffReplyToTicket, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // A plain ref, not the `isPending` from useActionState: several Enter
  // presses fired faster than React re-renders (proven live -- rapid-fire
  // Enter produced two identical STAFF messages from one intended reply)
  // all read the same stale `isPending === false` from the last completed
  // render before the first submit's pending state ever committed. A ref
  // mutates synchronously inside the handler itself, so the very next
  // keydown -- re-render or not -- sees it.
  const isSubmittingRef = useRef(false);

  async function refresh() {
    const t = await getTicketForStaff(ticketId);
    setTicket(t);
  }

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    // Self-scheduling instead of setInterval: this query can take seconds on
    // a loaded connection, and a fixed 1.5s interval piling up overlapping
    // requests meant an older, slower response could land after a newer one
    // and clobber a reply the staff member had just sent -- the "system
    // misbehaved" symptom. The next poll only fires once the previous one
    // has actually resolved (see SupportChatPanel for the same fix on the
    // customer side).
    async function poll() {
      const t = await getTicketForStaff(ticketId);
      if (!cancelled) {
        setTicket(t);
        timer = setTimeout(poll, POLL_MS);
      }
    }
    poll();
    listSupportStaff().then(setStaff);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ticketId]);

  useEffect(() => {
    isSubmittingRef.current = false;
    if (replyState?.success) {
      formRef.current?.reset();
      getTicketForStaff(ticketId).then(setTicket);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyState]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages.length]);

  async function handleAssign(assignedToId: string) {
    const formData = new FormData();
    formData.set("ticketId", ticketId);
    formData.set("assignedToId", assignedToId);
    await assignTicket(undefined, formData);
    refresh();
  }

  async function handleStatus(status: string) {
    const formData = new FormData();
    formData.set("ticketId", ticketId);
    formData.set("status", status);
    await updateTicketStatus(undefined, formData);
    refresh();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // See isSubmittingRef above for why this is a ref, not `isPending`.
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      formRef.current?.requestSubmit();
    }
  }

  return (
    <Modal title={ticket?.subject ?? "Ticket"} onClose={onClose} maxWidthClassName="max-w-lg">
      {!ticket ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
          <Spinner className="h-4 w-4" /> Loading…
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span>
              From <span className="font-medium text-zinc-700 dark:text-zinc-300">{ticket.user.name ?? ticket.user.email}</span>
            </span>
            <select
              value={ticket.status}
              onChange={(e) => handleStatus(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={ticket.assignedToId ?? ""}
              onChange={(e) => handleAssign(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name ?? s.email}
                </option>
              ))}
            </select>
            {ticket.firstStaffReplyAt ? (
              <span>
                First response: {Math.round((ticket.firstStaffReplyAt.getTime() - ticket.createdAt.getTime()) / 60000)}m
              </span>
            ) : (
              <span className="font-medium text-amber-600 dark:text-amber-400">Awaiting first human reply</span>
            )}
          </div>

          <div className="max-h-80 flex-1 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
            {ticket.messages.map((m) => (
              <div
                key={m.id}
                className={`mb-2 max-w-[85%] rounded-md px-2 py-1 text-sm ${
                  m.sender === "STAFF"
                    ? "ml-auto bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : m.sender === "SYSTEM"
                      ? "mx-auto bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                      : "bg-zinc-100 dark:bg-zinc-800"
                }`}
              >
                <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide uppercase opacity-70">
                  {SENDER_LABEL[m.sender] ?? m.sender}
                  {m.outcome && (
                    <span
                      className={`rounded px-1 py-0.5 normal-case ${
                        m.outcome === "answered"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}
                    >
                      {m.outcome}
                    </span>
                  )}
                </p>
                <p className="whitespace-pre-line">{m.body}</p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form ref={formRef} action={replyAction} className="flex flex-col gap-2">
            <input type="hidden" name="ticketId" value={ticketId} />
            <textarea
              name="body"
              required
              rows={2}
              maxLength={2000}
              placeholder="Reply to the customer… (Enter to send, Shift+Enter for a new line)"
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            {replyState?.error && <p className="text-xs text-red-600 dark:text-red-400">{replyState.error}</p>}
            <SubmitButton
              pendingLabel="Sending…"
              className="self-end rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Reply
            </SubmitButton>
          </form>
        </div>
      )}
    </Modal>
  );
}

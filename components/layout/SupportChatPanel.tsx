"use client";

import { useEffect, useRef, useState, useActionState, type KeyboardEvent } from "react";
import { sendChatMessage, getMyActiveTicket, type ChatTicket } from "@/lib/actions/support";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Spinner } from "@/components/ui/Spinner";

const SENDER_LABEL: Record<string, string> = {
  USER: "You",
  STAFF: "PropertyKE support",
  AI: "PropertyKE assistant",
  SYSTEM: "System",
};

// Short interval -- this is a cheap single-row query, and a snappier poll
// is the main lever available for "chat feels slow" without real-time
// infra (no websocket/SSE backend here). Combined with the "assistant is
// typing…" placeholder below, this keeps the perceived wait short even
// though the AI call itself still takes a second or two.
const POLL_MS = 1500;

// Live chat = the signed-in user's current SupportTicket (see
// lib/actions/support.ts) rendered as a message thread. Polls rather than
// using a socket -- there's no persistent-connection infra in this app, and
// a few-second delay is fine for a first-line support widget.
export function SupportChatPanel() {
  const [ticket, setTicket] = useState<ChatTicket | null | undefined>(undefined);
  const [state, action] = useActionState(sendChatMessage, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // A plain ref, not the `isPending` from useActionState: several Enter
  // presses fired faster than React re-renders all read the same stale
  // `isPending === false` from the last completed render, before the first
  // submit's pending state ever committed -- proven live on the staff-reply
  // side (TicketDetailModal), which used this same pattern and produced two
  // duplicate messages from rapid-fire Enter. A ref mutates synchronously
  // inside the handler itself, so the very next keydown -- re-render or not
  // -- sees it.
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    // Self-scheduling instead of setInterval: a slow round trip (a loaded
    // Turso connection, a bad network) must not pile up overlapping polls
    // on top of each other -- the next poll only fires once the previous
    // one has actually finished.
    async function poll() {
      try {
        const t = await getMyActiveTicket();
        if (!cancelled) setTicket(t);
      } catch {
        // A transient network blip (or a dev-server restart) shouldn't stop
        // the poll or throw an unhandled rejection -- just try again shortly.
      } finally {
        if (!cancelled) timer = setTimeout(poll, POLL_MS);
      }
    }
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    isSubmittingRef.current = false;
    if (state?.success) {
      formRef.current?.reset();
      getMyActiveTicket().then(setTicket);
    }
  }, [state]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages.length]);

  if (ticket === undefined) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
        <Spinner className="h-4 w-4" /> Loading…
      </div>
    );
  }

  // No reply yet since the visitor's own last message -- shown as a
  // lightweight "typing…" placeholder so sending a message feels
  // acknowledged immediately instead of looking stalled while the AI call
  // and the next poll catch up.
  const awaitingReply = !!ticket?.messages.length && ticket.messages[ticket.messages.length - 1].sender === "USER";

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
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
        {!ticket && (
          <p className="p-2 text-sm text-zinc-500">
            Send a message below to start a conversation with our team. An assistant will jump in
            right away, and a human will follow up if you need one.
          </p>
        )}
        {ticket?.messages.map((m) => (
          <div
            key={m.id}
            className={`mb-2 max-w-[85%] rounded-md px-2 py-1 text-sm ${
              m.sender === "USER"
                ? "ml-auto bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : m.sender === "SYSTEM"
                  ? "mx-auto bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                  : "bg-zinc-100 dark:bg-zinc-800"
            }`}
          >
            <p className="text-[10px] font-semibold tracking-wide uppercase opacity-70">
              {SENDER_LABEL[m.sender] ?? m.sender}
            </p>
            <p className="whitespace-pre-line">{m.body}</p>
          </div>
        ))}
        {awaitingReply && (
          <div className="mb-2 max-w-[85%] rounded-md bg-zinc-100 px-2 py-1 text-sm text-zinc-500 dark:bg-zinc-800">
            <Spinner className="inline h-3 w-3" /> typing…
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form ref={formRef} action={action} className="flex shrink-0 flex-col gap-2">
        <input type="hidden" name="ticketId" value={ticket?.id ?? ""} />
        <textarea
          name="body"
          required
          rows={2}
          maxLength={2000}
          placeholder="Type your message… (Enter to send, Shift+Enter for a new line)"
          onKeyDown={handleKeyDown}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
        <SubmitButton
          pendingLabel={ticket ? "Sending…" : "Creating chat…"}
          className="self-end rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Send
        </SubmitButton>
      </form>
    </div>
  );
}

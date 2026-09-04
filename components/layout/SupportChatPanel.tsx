"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import { sendChatMessage, getMyActiveTicket, type ChatTicket } from "@/lib/actions/support";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Spinner } from "@/components/ui/Spinner";

const SENDER_LABEL: Record<string, string> = {
  USER: "You",
  STAFF: "PropertyKE support",
  AI: "PropertyKE assistant",
  SYSTEM: "System",
};

const POLL_MS = 4000;

// Live chat = the signed-in user's current SupportTicket (see
// lib/actions/support.ts) rendered as a message thread. Polls rather than
// using a socket -- there's no persistent-connection infra in this app, and
// a few-second delay is fine for a first-line support widget.
export function SupportChatPanel() {
  const [ticket, setTicket] = useState<ChatTicket | null | undefined>(undefined);
  const [state, action] = useActionState(sendChatMessage, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMyActiveTicket().then(setTicket);
    const interval = setInterval(() => {
      getMyActiveTicket().then(setTicket);
    }, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
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

  return (
    <div className="flex h-96 flex-col gap-3">
      <div className="flex-1 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
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
        <div ref={bottomRef} />
      </div>
      <form ref={formRef} action={action} className="flex flex-col gap-2">
        <input type="hidden" name="ticketId" value={ticket?.id ?? ""} />
        <textarea
          name="body"
          required
          rows={2}
          maxLength={2000}
          placeholder="Type your message…"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
        <SubmitButton
          pendingLabel="Sending…"
          className="self-end rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Send
        </SubmitButton>
      </form>
    </div>
  );
}

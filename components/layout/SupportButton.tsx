"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { MessageCircleMore, MessageCircle, Mail, MessageSquare, MessageSquareText, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { SupportChatPanel } from "@/components/layout/SupportChatPanel";
import { RevealPhoneButton } from "@/components/ui/RevealPhoneButton";
import { closeChatSession } from "@/lib/actions/support";
import type { SupportContact } from "@/lib/support";

type View = "menu" | "chat";

// Entry point for customer support: WhatsApp/call/email straight to the
// platform admin's own contact details (see lib/support.ts), plus in-app
// live chat (see SupportChatPanel/lib/actions/support.ts) for signed-in
// users. WhatsApp is listed first since a prefilled deep link is the
// closest thing to an instant, always-on channel outside the live chat.
//
// Rendered once at the root layout (not per-page) as a fixed bottom-right
// bubble -- the placement/shape most chat widgets use (Intercom, WhatsApp's
// own widget, etc.) -- so it's reachable from anywhere on the site without
// scrolling back up to the header, instead of a small icon buried among the
// other header controls.
export function SupportButton({ contact, signedIn }: { contact: SupportContact; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  // createPortal needs document.body, which doesn't exist during SSR --
  // render the floating bubble only once mounted on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function close() {
    // Only when actually closing out of the chat widget itself (not the
    // WhatsApp/call/email menu) -- deletes the chat unless it still needs a
    // human (see closeChatSession). Fire-and-forget: closing shouldn't wait
    // on a network round trip.
    if (view === "chat") closeChatSession();
    setOpen(false);
    setView("menu");
  }

  return (
    <>
      {mounted &&
        !open &&
        createPortal(
          <button
            onClick={() => setOpen(true)}
            aria-label="Contact support"
            title="Contact support"
            className="fixed right-4 bottom-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700"
          >
            <MessageCircleMore size={26} />
          </button>,
          document.body
        )}
      {open && view === "menu" && (
        <Modal title="Contact support" onClose={close} maxWidthClassName="max-w-sm">
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-zinc-500">Reach {contact.name} directly:</p>
            <div className="flex flex-col gap-2">
              {signedIn ? (
                <button
                  type="button"
                  onClick={() => setView("chat")}
                  className="flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 font-medium text-white hover:bg-green-700"
                >
                  <MessageSquare size={16} /> Live chat
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => signIn("google")}
                  className="flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  <MessageSquare size={16} /> Sign in for live chat
                </button>
              )}
              {signedIn && (
                <Link
                  href="/?tab=account&atab=feedback"
                  onClick={close}
                  className="flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  <MessageSquareText size={16} /> Send feedback
                </Link>
              )}
              {contact.whatsappUrl && (
                <a
                  href={contact.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 font-medium text-white hover:bg-green-700"
                >
                  <MessageCircle size={16} /> Chat on WhatsApp
                </a>
              )}
              {contact.phone && (
                <RevealPhoneButton
                  phone={contact.phone}
                  className="flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                />
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  <Mail size={16} /> Email us
                </a>
              )}
              {!contact.whatsappUrl && !contact.phone && !contact.email && (
                <p className="text-zinc-500">Direct contact isn&apos;t set up yet — try live chat.</p>
              )}
            </div>
            <p className="border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-zinc-800">
              Safety tip: never send a deposit or payment before viewing a property in person and
              verifying its title/ownership. PropertyKE never asks you to pay support staff directly.
            </p>
          </div>
        </Modal>
      )}
      {open && view === "chat" && <ChatWidget onBack={() => setView("menu")} onClose={close} />}
    </>
  );
}

// A fixed bottom-right panel (the layout most chat widgets use -- Intercom,
// Crisp, etc.) instead of a centered Modal overlay: it sits alongside the
// page instead of blocking it, so a visitor can keep browsing listings
// while chatting.
function ChatWidget({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live chat"
      className="fixed right-4 bottom-4 z-60 flex h-130 w-90 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-70"
        >
          <MessageSquare size={16} /> Live chat
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-2">
        <SupportChatPanel />
      </div>
    </div>,
    document.body
  );
}

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { LifeBuoy, MessageCircle, Phone, Mail, Headset } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { SupportChatPanel } from "@/components/layout/SupportChatPanel";
import type { SupportContact } from "@/lib/support";

type View = "menu" | "chat";

// Entry point for customer support: WhatsApp/call/email straight to the
// platform admin's own contact details (see lib/support.ts), plus in-app
// live chat (see SupportChatPanel/lib/actions/support.ts) for signed-in
// users. WhatsApp is listed first since a prefilled deep link is the
// closest thing to an instant, always-on channel outside the live chat.
export function SupportButton({ contact, signedIn }: { contact: SupportContact; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");

  function close() {
    setOpen(false);
    setView("menu");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Contact support"
        title="Contact support"
        className="flex items-center justify-center rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <LifeBuoy size={18} />
      </button>
      {open && (
        <Modal
          title={view === "chat" ? "Live chat" : "Contact support"}
          onClose={close}
          maxWidthClassName="max-w-sm"
        >
          {view === "menu" ? (
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-zinc-500">Reach {contact.name} directly:</p>
              <div className="flex flex-col gap-2">
                {signedIn ? (
                  <button
                    type="button"
                    onClick={() => setView("chat")}
                    className="flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                  >
                    <Headset size={16} /> Live chat
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => signIn("google")}
                    className="flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    <Headset size={16} /> Sign in for live chat
                  </button>
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
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    <Phone size={16} /> Call {contact.phone}
                  </a>
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
          ) : (
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => setView("menu")} className="self-start text-xs text-zinc-500 underline">
                ← Other ways to reach us
              </button>
              <SupportChatPanel />
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

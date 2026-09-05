"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { detectInstallPlatform, INSTALL_INSTRUCTIONS } from "@/lib/installInstructions";

// Not a standard DOM type -- Chrome/Edge/Android fire this instead of
// letting the browser show its own install UI, so the app can offer its own
// install affordance instead.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // matchMedia doesn't exist during SSR, so this can't be a lazy useState
    // initializer -- and unlike ThemeProvider's theme, there's no way to
    // apply this before paint either, since "already installed" can only be
    // known once the browser reports its actual display-mode.
    if (window.matchMedia("(display-mode: standalone)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInstalled(true);
    }

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Already installed and running as the app itself -- nothing to offer.
  if (installed) return null;

  async function handleClick() {
    // Chrome/Edge (once their own engagement heuristics are satisfied): use
    // the real native prompt.
    if (deferredPrompt) {
      setPending(true);
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } finally {
        // A prompt can only be used once -- discard it either way; a fresh
        // one will replace it if the browser offers another later.
        setDeferredPrompt(null);
        setPending(false);
      }
      return;
    }
    // Every other case (Safari, Firefox, or Chrome before it's decided to
    // offer the native prompt yet): show manual instructions instead of
    // just doing nothing.
    setShowInstructions(true);
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={pending}
        aria-label="Install app"
        title="Install app"
        className="flex items-center justify-center rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <Download size={18} />
      </button>
      {showInstructions && (
        <Modal title="Install EstateFinderHub" onClose={() => setShowInstructions(false)} maxWidthClassName="max-w-sm">
          <p className="text-sm">{INSTALL_INSTRUCTIONS[detectInstallPlatform()]}</p>
        </Modal>
      )}
    </>
  );
}

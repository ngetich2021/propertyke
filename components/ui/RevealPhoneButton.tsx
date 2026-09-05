"use client";

import { useState } from "react";

// A mouse/trackpad ("fine" pointer) is the desktop/laptop signal -- tel:
// links are useless there (nothing to dial), so reveal as plain text
// instead. A touch-primary ("coarse" pointer) device -- phone or tablet --
// gets the real tel: link so tapping it opens the dialer.
function isTouchPrimary(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

// The number stays hidden until the visitor deliberately asks for it --
// avoids leaking a phone number to anyone who merely opens the page (bots
// scraping it included), while keeping it one click away for someone who's
// actually interested.
export function RevealPhoneButton({ phone, className }: { phone: string; className?: string }) {
  const [revealed, setRevealed] = useState(false);

  const baseClassName =
    className ??
    "mt-2 inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300";

  if (revealed) {
    if (isTouchPrimary()) {
      return (
        <a href={`tel:${phone}`} className={baseClassName}>
          📞 {phone}
        </a>
      );
    }
    return <span className={baseClassName}>📞 {phone}</span>;
  }

  return (
    <button type="button" onClick={() => setRevealed(true)} className={baseClassName}>
      📞 Show phone number
    </button>
  );
}

"use client";

import { useState } from "react";

// The number stays hidden until the visitor deliberately asks for it --
// avoids leaking a phone number to anyone who merely opens the listing (bots
// scraping the page included), while keeping it one click away for someone
// who's actually interested.
export function RevealPhoneButton({ phone, className }: { phone: string; className?: string }) {
  const [revealed, setRevealed] = useState(false);

  const baseClassName =
    className ??
    "mt-2 inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300";

  if (revealed) {
    return (
      <a href={`tel:${phone}`} className={baseClassName}>
        📞 {phone}
      </a>
    );
  }

  return (
    <button type="button" onClick={() => setRevealed(true)} className={baseClassName}>
      📞 Show phone number
    </button>
  );
}

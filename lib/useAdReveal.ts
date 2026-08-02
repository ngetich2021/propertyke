"use client";

import { useState, useTransition } from "react";
import { getListingSummary } from "@/lib/actions/listings";
import type { ListingSummary } from "@/components/listings/ListingPreviewCard";

// Clicking an ad (anywhere except the video itself) reveals the promoted
// listing inline, in place, instead of navigating away. Owned by the caller
// rather than tied to any single ad's lifetime: in a rotating slot, the
// video underneath can finish and hand off to the next ad at any time, but
// that must never yank this popup out from under someone reading it -- it
// stays open (still showing the listing it was opened for) until the
// visitor explicitly closes it via `close`/`toggle`.
export function useAdReveal() {
  const [open, setOpen] = useState(false);
  const [listingId, setListingId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ListingSummary | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setListingId(id);
    if (listingId === id && summary) return;
    setSummary(null);
    startTransition(async () => {
      const data = await getListingSummary(id);
      setSummary(data);
    });
  }

  function close() {
    setOpen(false);
  }

  return { open, listingId, summary, isPending, toggle, close };
}

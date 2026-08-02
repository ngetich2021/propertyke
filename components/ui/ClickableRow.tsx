"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ListingDetailModal } from "@/components/listings/ListingDetailModal";

export function ClickableRow({
  listingId,
  children,
}: {
  listingId: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        onClick={() => setOpen(true)}
        className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900"
      >
        {children}
      </tr>
      {open && <ListingDetailModal listingId={listingId} onClose={() => setOpen(false)} />}
    </>
  );
}

"use client";

import { useState, type MouseEvent } from "react";
import type { ReactNode } from "react";
import { ListingDetailModal } from "@/components/listings/ListingDetailModal";
import { CLICKABLE_ROW_CLASS, handleRowKeyDown, isInteractiveRowClick } from "@/lib/clickableRow";

export function ClickableRow({
  listingId,
  children,
}: {
  listingId: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  function handleClick(e: MouseEvent<HTMLTableRowElement>) {
    if (isInteractiveRowClick(e)) return;
    setOpen(true);
  }

  return (
    <>
      <tr
        onClick={handleClick}
        onKeyDown={(e) => handleRowKeyDown(e, () => setOpen(true))}
        tabIndex={0}
        className={CLICKABLE_ROW_CLASS}
      >
        {children}
      </tr>
      {open && <ListingDetailModal listingId={listingId} onClose={() => setOpen(false)} />}
    </>
  );
}

"use client";

import { useState, type MouseEvent } from "react";
import type { ReactNode } from "react";
import { ListingDetailModal } from "@/components/listings/ListingDetailModal";
import { TableRow } from "@/components/ui/table";
import { CLICKABLE_ROW_CLASS, handleRowKeyDown, isInteractiveRowClick } from "@/lib/clickableRow";

export function ClickableRow({
  listingId,
  children,
}: {
  // Null once the listing has been deleted (e.g. its owner deleted their
  // account) -- there's nothing left to open, so the row just isn't
  // clickable.
  listingId: string | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!listingId) {
    return <TableRow>{children}</TableRow>;
  }

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

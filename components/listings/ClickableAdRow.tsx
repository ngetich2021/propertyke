"use client";

import { useState, type MouseEvent } from "react";
import type { ReactNode } from "react";
import { AdDetailModal } from "@/components/listings/AdDetailModal";
import { CLICKABLE_ROW_CLASS, handleRowKeyDown, isInteractiveRowClick } from "@/lib/clickableRow";
import type { Ad, Listing, User } from "@/app/generated/prisma/client";

export function ClickableAdRow({
  ad,
  children,
}: {
  // `owner` is only present when the caller is an admin browsing every ad
  // (see AdsPanel) -- an owner viewing their own ads already knows who
  // posted it, so that query doesn't fetch it.
  ad: Ad & { listing: Listing; owner?: User };
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
      {open && <AdDetailModal ad={ad} onClose={() => setOpen(false)} />}
    </>
  );
}

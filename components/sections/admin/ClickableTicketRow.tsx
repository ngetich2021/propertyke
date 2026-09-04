"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { TicketDetailModal } from "@/components/sections/admin/TicketDetailModal";
import { CLICKABLE_ROW_CLASS, handleRowKeyDown, isInteractiveRowClick } from "@/lib/clickableRow";

export function ClickableTicketRow({ ticketId, children }: { ticketId: string; children: ReactNode }) {
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
      {open && <TicketDetailModal ticketId={ticketId} onClose={() => setOpen(false)} />}
    </>
  );
}

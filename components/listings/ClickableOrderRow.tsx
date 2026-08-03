"use client";

import { useState, type MouseEvent } from "react";
import type { ReactNode } from "react";
import { OrderDetailModal } from "@/components/listings/OrderDetailModal";
import { CLICKABLE_ROW_CLASS, handleRowKeyDown, isInteractiveRowClick } from "@/lib/clickableRow";
import type { Order, Listing, User } from "@/app/generated/prisma/client";

export function ClickableOrderRow({
  order,
  role,
  children,
}: {
  order: Order & { listing: Listing & { owner?: User }; buyer?: User };
  role: "owner" | "buyer" | "admin";
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
      {open && <OrderDetailModal order={order} role={role} onClose={() => setOpen(false)} />}
    </>
  );
}

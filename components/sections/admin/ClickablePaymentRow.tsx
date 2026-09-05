"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { PaymentDetailModal } from "./PaymentDetailModal";
import { CLICKABLE_ROW_CLASS, handleRowKeyDown, isInteractiveRowClick } from "@/lib/clickableRow";
import type { Payment, User } from "@/app/generated/prisma/client";

type PaymentRow = Payment & { user: User };

export function ClickablePaymentRow({ payment, children }: { payment: PaymentRow; children: ReactNode }) {
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
      {open && <PaymentDetailModal payment={payment} onClose={() => setOpen(false)} />}
    </>
  );
}

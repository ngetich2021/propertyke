"use client";

import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/format";
import { SOURCE_LABEL } from "./RevenueTable";
import type { Payment, User } from "@/app/generated/prisma/client";

type PaymentRow = Payment & { user: User };

// Read-only: unlike orders/listings/ads/tours, a payment's status/receipt
// comes straight from M-Pesa's own callback (see lib/mpesa.ts,
// lib/paymentApply.ts) -- there's nothing for an admin to legitimately
// change here, just a record to inspect.
export function PaymentDetailModal({ payment, onClose }: { payment: PaymentRow; onClose: () => void }) {
  return (
    <Modal title="Payment details" onClose={onClose}>
      <div className="flex flex-col gap-4 text-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold">{SOURCE_LABEL[payment.purpose]}</h3>
            <p className="text-xs text-zinc-500">{new Date(payment.createdAt).toLocaleString()}</p>
          </div>
          <StatusBadge status={payment.status} />
        </div>

        <p className="text-lg font-semibold">{formatMoney(payment.amount)}</p>

        <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Paid by</p>
          <p>{payment.user.name ?? "—"}</p>
          <p className="text-zinc-500">{payment.user.email}</p>
          <p className="text-zinc-500">{payment.phone}</p>
        </div>

        <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">M-Pesa</p>
          <p>{payment.mpesaReceipt ?? "No receipt yet"}</p>
          {payment.resultDesc && <p className="text-zinc-500">{payment.resultDesc}</p>}
        </div>

        {payment.appliedAt && (
          <p className="text-xs text-zinc-500">Applied {new Date(payment.appliedAt).toLocaleString()}</p>
        )}
      </div>
    </Modal>
  );
}

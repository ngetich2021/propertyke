"use client";

import { useId } from "react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { RevealPhoneButton } from "@/components/ui/RevealPhoneButton";
import { updateOrderStatus } from "@/lib/actions/orders";
import { formatMoney } from "@/lib/format";
import type { Order, Listing, User, OrderStatus } from "@/app/generated/prisma/client";

type OrderWithListing = Order & { listing: (Listing & { owner?: User }) | null; buyer?: User };

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
];

const CONTACT_METHOD_LABEL: Record<string, string> = {
  CALL: "Phone call",
  SMS: "SMS / text",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
};

export function OrderDetailModal({
  order,
  role,
  onClose,
}: {
  order: OrderWithListing;
  // "owner" = viewing an order placed on one of your own listings (can
  // update its status); "buyer" = viewing your own inquiry (read-only);
  // "admin" = platform-wide view, sees both sides and can also manage status.
  role: "owner" | "buyer" | "admin";
  onClose: () => void;
}) {
  const id = useId();
  const canManage = role === "owner" || role === "admin";
  return (
    <Modal title="Order details" onClose={onClose}>
      <div className="flex flex-col gap-4 text-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold">{order.listing?.title ?? "Listing removed"}</h3>
            <p className="text-xs text-zinc-500">Placed {new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <p className="text-lg font-semibold">{formatMoney(order.amount, order.listing?.currency)}</p>

        {canManage && order.buyer && (
          <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Buyer</p>
            <p>{order.buyer.name ?? "—"}</p>
            <p className="text-zinc-500">{order.buyer.email}</p>
          </div>
        )}

        {role === "admin" && order.listing?.owner && (
          <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Seller</p>
            <p>{order.listing.owner.businessName ?? order.listing.owner.name ?? "—"}</p>
            <p className="text-zinc-500">{order.listing.owner.email}</p>
            {order.listing.owner.phone && <RevealPhoneButton phone={order.listing.owner.phone} className="underline" />}
          </div>
        )}

        <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Contact</p>
          <RevealPhoneButton phone={order.contactPhone} className="font-medium underline" />
          <p className="text-zinc-500">
            Prefers: {CONTACT_METHOD_LABEL[order.contactMethod] ?? order.contactMethod}
          </p>
        </div>

        {order.message && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Message</p>
            <p className="italic">&ldquo;{order.message}&rdquo;</p>
          </div>
        )}

        {canManage ? (
          <form
            action={updateOrderStatus}
            className="flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800"
          >
            <label htmlFor={`${id}-status`} className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Update status
            </label>
            <input type="hidden" name="orderId" value={order.id} />
            <div className="flex items-center gap-2">
              <select
                id={`${id}-status`}
                name="status"
                defaultValue={order.status}
                className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <SubmitButton className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
                Save
              </SubmitButton>
            </div>
          </form>
        ) : (
          <p className="border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-zinc-800">
            The owner has been notified by email and can update this order&apos;s status as they follow up
            with you.
          </p>
        )}
      </div>
    </Modal>
  );
}

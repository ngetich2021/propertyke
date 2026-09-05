"use client";

import { formatMoney } from "@/lib/format";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { ClickablePaymentRow } from "./ClickablePaymentRow";
import type { Payment, PaymentPurpose, User } from "@/app/generated/prisma/client";

export const SOURCE_LABEL: Record<PaymentPurpose, string> = {
  LISTING_CREATE: "Listing",
  LISTING_EXTEND: "Listing addition",
  AD_CREATE: "Ads",
  AD_EXTEND: "Ads addition",
  VERIFICATION: "Verification",
};

type PaymentRow = Payment & { user: User };

// Column defs (with JSX-returning cell/header functions) live here, inside
// the client boundary, rather than in RevenuePanel (a Server Component) --
// see RolesTable.tsx for why.
const columns: DataTableColumnDef<PaymentRow>[] = [
  {
    id: "#",
    header: "#",
    enableSorting: false,
    meta: { headerClassName: STICKY_COL_1, cellClassName: STICKY_COL_1 },
    cell: ({ row }) => row.getDisplayIndex() + 1,
  },
  {
    id: "name",
    accessorFn: (row) => row.user.name ?? row.user.email,
    header: ({ column }) => <SortableHeader label="Name" column={column} />,
    meta: { headerClassName: STICKY_COL_2, cellClassName: STICKY_COL_2 },
    cell: ({ row }) => row.original.user.name ?? row.original.user.email,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <SortableHeader label="Time" column={column} />,
    cell: ({ row }) => <span className="text-zinc-500">{row.original.createdAt.toLocaleString()}</span>,
  },
  {
    accessorKey: "phone",
    header: "Tel",
    enableSorting: false,
    cell: ({ row }) => <span className="text-zinc-500">{row.original.phone}</span>,
  },
  {
    accessorKey: "mpesaReceipt",
    header: "M-Pesa code",
    enableSorting: false,
    cell: ({ row }) => <span className="text-zinc-500">{row.original.mpesaReceipt ?? "—"}</span>,
  },
  {
    id: "source",
    accessorFn: (row) => SOURCE_LABEL[row.purpose],
    header: ({ column }) => <SortableHeader label="Source" column={column} />,
    cell: ({ row }) => SOURCE_LABEL[row.original.purpose],
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <SortableHeader label="Amount" column={column} />,
    cell: ({ row }) => formatMoney(row.original.amount),
  },
];

export function RevenueTable({ payments }: { payments: PaymentRow[] }) {
  return (
    <DataTable
      minWidth="700px"
      emptyMessage="No payments yet."
      columns={columns}
      data={payments}
      getRowSearchText={(p) =>
        [p.user.name, p.user.email, p.phone, p.mpesaReceipt, SOURCE_LABEL[p.purpose]].filter(Boolean).join(" ")
      }
      renderRow={(payment, cells) => (
        <ClickablePaymentRow key={payment.id} payment={payment}>
          {cells}
        </ClickablePaymentRow>
      )}
    />
  );
}

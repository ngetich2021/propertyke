"use client";

import { formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { ClickableOrderRow } from "@/components/listings/ClickableOrderRow";
import type { Listing, Order, User } from "@/app/generated/prisma/client";

// listing is null once the listing (or its owner's account) has been
// deleted -- the order itself still shows for the buyer and admin.
type OrderRow = Order & { listing: (Listing & { owner: User }) | null; buyer: User };

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
];

// Column defs (with JSX-returning cell/header functions) live here, inside
// the client boundary, rather than in AdminOrdersPanel (a Server
// Component) -- see RolesTable.tsx for why.
const columns: DataTableColumnDef<OrderRow>[] = [
  {
    id: "#",
    header: "#",
    enableSorting: false,
    meta: { headerClassName: STICKY_COL_1, cellClassName: STICKY_COL_1 },
    cell: ({ row }) => row.getDisplayIndex() + 1,
  },
  {
    id: "listing",
    accessorFn: (row) => row.listing?.title ?? "Listing removed",
    header: ({ column }) => <SortableHeader label="Listing" column={column} />,
    meta: { headerClassName: STICKY_COL_2, cellClassName: STICKY_COL_2 },
    cell: ({ row }) => row.original.listing?.title ?? "Listing removed",
  },
  {
    id: "buyer",
    accessorFn: (row) => row.buyer.name ?? row.buyer.email,
    header: ({ column }) => <SortableHeader label="Buyer" column={column} />,
    cell: ({ row }) => (
      <span className="block max-w-35 truncate text-zinc-500">
        {row.original.buyer.name ?? row.original.buyer.email}
      </span>
    ),
  },
  {
    id: "seller",
    accessorFn: (row) => row.listing?.owner.businessName ?? row.listing?.owner.name ?? row.listing?.owner.email ?? "Account deleted",
    header: ({ column }) => <SortableHeader label="Seller" column={column} />,
    cell: ({ row }) => (
      <span className="block max-w-35 truncate text-zinc-500">
        {row.original.listing?.owner.businessName ?? row.original.listing?.owner.name ?? row.original.listing?.owner.email ?? "Account deleted"}
      </span>
    ),
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <SortableHeader label="Amount" column={column} />,
    cell: ({ row }) => formatMoney(row.original.amount, row.original.listing?.currency),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader label="Status" column={column} />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function AdminOrdersTable({ orders }: { orders: OrderRow[] }) {
  return (
    <DataTable
      minWidth="700px"
      emptyMessage="No orders yet."
      columns={columns}
      data={orders}
      getRowSearchText={(order) =>
        [
          order.listing?.title,
          order.buyer.name,
          order.buyer.email,
          order.listing?.owner.businessName,
          order.listing?.owner.name,
          order.listing?.owner.email,
          order.contactPhone,
          order.status,
        ]
          .filter(Boolean)
          .join(" ")
      }
      statusFilter={{ columnId: "status", label: "status", options: STATUS_OPTIONS }}
      renderRow={(order, cells) => (
        <ClickableOrderRow key={order.id} order={order} role="admin">
          {cells}
        </ClickableOrderRow>
      )}
    />
  );
}

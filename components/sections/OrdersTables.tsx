"use client";

import { useMemo } from "react";
import { formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { ClickableOrderRow } from "@/components/listings/ClickableOrderRow";
import type { Listing, Order, User } from "@/app/generated/prisma/client";

type OwnerListing = Listing & { owner: User };
// listing is null once the listing (or its owner's account) has been
// deleted -- the order itself still shows for the buyer and any admin.
type OwnerOrderRow = Order & { listing: OwnerListing | null; buyer: User };
type BuyerOrderRow = Order & { listing: Listing | null };

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
];

// Column defs (with JSX-returning cell/header functions) live here, inside
// the client boundary, rather than in OrdersSection (a Server Component) --
// see RolesTable.tsx for why.
function buildOwnerColumns(currentUserId: string): DataTableColumnDef<OwnerOrderRow>[] {
  return [
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
    cell: ({ row }) => (
      <>
        <span className="flex items-center gap-1.5">
          {row.original.listing?.title ?? "Listing removed"}
          {row.original.listing && row.original.listing.owner.id !== currentUserId && (
            <Badge variant="outline" title="You're managing this for them">
              {row.original.listing.owner.businessName ?? row.original.listing.owner.name ?? "Managed"}
            </Badge>
          )}
        </span>
        {row.original.message && (
          <p className="text-xs italic text-zinc-500">&ldquo;{row.original.message}&rdquo;</p>
        )}
      </>
    ),
  },
  {
    id: "buyer",
    accessorFn: (row) => row.buyer.name ?? row.buyer.email,
    header: ({ column }) => <SortableHeader label="Buyer" column={column} />,
    cell: ({ row }) => (
      <span className="text-zinc-500">{row.original.buyer.name ?? row.original.buyer.email}</span>
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
}

const buyerColumns: DataTableColumnDef<BuyerOrderRow>[] = [
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

export function OwnerOrdersTable({ orders, currentUserId }: { orders: OwnerOrderRow[]; currentUserId: string }) {
  const ownerColumns = useMemo(() => buildOwnerColumns(currentUserId), [currentUserId]);
  return (
    <DataTable
      minWidth="600px"
      emptyMessage="No one has expressed interest yet."
      columns={ownerColumns}
      data={orders}
      getRowSearchText={(order) =>
        [order.listing?.title, order.buyer.name, order.buyer.email, order.status].filter(Boolean).join(" ")
      }
      statusFilter={{ columnId: "status", label: "status", options: STATUS_OPTIONS }}
      renderRow={(order, cells) => (
        <ClickableOrderRow key={order.id} order={order} role="owner">
          {cells}
        </ClickableOrderRow>
      )}
    />
  );
}

export function BuyerOrdersTable({ orders }: { orders: BuyerOrderRow[] }) {
  return (
    <DataTable
      minWidth="400px"
      emptyMessage="You haven't expressed interest in anything yet."
      columns={buyerColumns}
      data={orders}
      getRowSearchText={(order) => [order.listing?.title, order.status].filter(Boolean).join(" ")}
      statusFilter={{ columnId: "status", label: "status", options: STATUS_OPTIONS }}
      renderRow={(order, cells) => (
        <ClickableOrderRow key={order.id} order={order} role="buyer">
          {cells}
        </ClickableOrderRow>
      )}
    />
  );
}

"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/format";
import { AdActionsMenu } from "./AdActionsMenu";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { ClickableAdRow } from "@/components/listings/ClickableAdRow";
import type { Ad, Listing, User } from "@/app/generated/prisma/client";

type AdRow = Ad & { listing: Listing; owner: User };

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
];

// Column defs (with JSX-returning cell/header functions) live here, inside
// the client boundary, rather than in AdsPanel (a Server Component) -- see
// RolesTable.tsx for why.
const columns: DataTableColumnDef<AdRow>[] = [
  {
    id: "#",
    header: "#",
    enableSorting: false,
    meta: { headerClassName: STICKY_COL_1, cellClassName: STICKY_COL_1 },
    cell: ({ row }) => row.getDisplayIndex() + 1,
  },
  {
    accessorKey: "companyName",
    header: ({ column }) => <SortableHeader label="Company" column={column} />,
    meta: { headerClassName: STICKY_COL_2, cellClassName: STICKY_COL_2 },
    cell: ({ row }) => row.original.companyName ?? "—",
  },
  {
    accessorKey: "productName",
    header: ({ column }) => <SortableHeader label="Product" column={column} />,
    cell: ({ row }) => <span className="block max-w-35 truncate">{row.original.productName ?? "—"}</span>,
  },
  {
    id: "listing",
    accessorFn: (row) => row.listing.title,
    header: ({ column }) => <SortableHeader label="Listing" column={column} />,
    cell: ({ row }) => <span className="block max-w-35 truncate text-zinc-500">{row.original.listing.title}</span>,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <SortableHeader label="Amount" column={column} />,
    cell: ({ row }) => formatMoney(row.original.amount, row.original.listing.currency),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader label="Status" column={column} />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    meta: { cellClassName: "text-right" },
    cell: ({ row }) => (
      <div className="flex justify-end">
        <AdActionsMenu adId={row.original.id} status={row.original.status} />
      </div>
    ),
  },
];

export function AdsTable({ ads }: { ads: AdRow[] }) {
  return (
    <DataTable
      minWidth="700px"
      emptyMessage="No ads yet."
      columns={columns}
      data={ads}
      getRowSearchText={(ad) =>
        [ad.companyName, ad.productName, ad.listing.title, ad.owner.email, ad.status].filter(Boolean).join(" ")
      }
      statusFilter={{ columnId: "status", label: "status", options: STATUS_OPTIONS }}
      renderRow={(ad, cells) => (
        <ClickableAdRow key={ad.id} ad={ad}>
          {cells}
        </ClickableAdRow>
      )}
    />
  );
}

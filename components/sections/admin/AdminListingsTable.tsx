"use client";

import { formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { ListingActionsMenu } from "./ListingActionsMenu";
import { RevealPhoneButton } from "@/components/ui/RevealPhoneButton";
import { DataTable, SortableHeader, STICKY_COL_1, STICKY_COL_2, type DataTableColumnDef } from "@/components/ui/data-table";
import { ClickableRow } from "@/components/ui/ClickableRow";
import type { Listing, ListingStatus, User } from "@/app/generated/prisma/client";

type Row = Listing & { owner: User };

const STATUS_OPTIONS: { value: ListingStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SOLD", label: "Sold" },
  { value: "RENTED", label: "Rented" },
  { value: "INACTIVE", label: "Inactive" },
];

// Column defs (with JSX-returning cell/header functions) live here, inside
// the client boundary, rather than in AdminListingsPanel (a Server
// Component) -- see RolesTable.tsx for why.
const columns: DataTableColumnDef<Row>[] = [
  {
    id: "#",
    header: "#",
    enableSorting: false,
    meta: { headerClassName: STICKY_COL_1, cellClassName: STICKY_COL_1 },
    cell: ({ row }) => row.getDisplayIndex() + 1,
  },
  {
    accessorKey: "title",
    header: ({ column }) => <SortableHeader label="Title" column={column} />,
    meta: { headerClassName: STICKY_COL_2, cellClassName: STICKY_COL_2 },
    cell: ({ row }) => row.original.title,
  },
  {
    id: "owner",
    accessorFn: (row) => row.owner.name ?? row.owner.email,
    header: ({ column }) => <SortableHeader label="Owner" column={column} />,
    cell: ({ row }) => (
      <span className="flex max-w-35 items-center gap-1 truncate text-zinc-500">
        {row.original.owner.name ?? row.original.owner.email}
        <VerifiedBadge verifiedUntil={row.original.owner.verifiedUntil} />
      </span>
    ),
  },
  {
    id: "contact",
    header: "Contact",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.owner.phone ? (
        <RevealPhoneButton phone={row.original.owner.phone} className="text-zinc-500 underline" />
      ) : (
        <span className="text-zinc-500">—</span>
      ),
  },
  {
    accessorKey: "price",
    header: ({ column }) => <SortableHeader label="Price" column={column} />,
    cell: ({ row }) => formatMoney(row.original.price, row.original.currency),
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
        <ListingActionsMenu listingId={row.original.id} currentStatus={row.original.status} />
      </div>
    ),
  },
];

export function AdminListingsTable({ listings }: { listings: Row[] }) {
  return (
    <DataTable
      minWidth="700px"
      columns={columns}
      data={listings}
      getRowSearchText={(l) => [l.title, l.owner.name, l.owner.email, l.status].filter(Boolean).join(" ")}
      statusFilter={{ columnId: "status", label: "status", options: STATUS_OPTIONS }}
      renderRow={(listing, cells) => (
        <ClickableRow key={listing.id} listingId={listing.id}>
          {cells}
        </ClickableRow>
      )}
    />
  );
}

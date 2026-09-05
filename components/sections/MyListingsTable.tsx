"use client";

import { useMemo } from "react";
import { ActivateListingButton } from "@/components/listings/ActivateListingButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { ClickableRow } from "@/components/ui/ClickableRow";
import { formatMoney } from "@/lib/format";
import { REACTIVATION_INTERVAL_MS } from "@/lib/listingActivationConstants";
import type { Listing } from "@/app/generated/prisma/client";

type ListingWithOwner = Listing & { owner?: { id: string; name: string | null; businessName: string | null } };

// Column defs (with JSX-returning cell/header functions) live here, inside
// the client boundary, rather than in AddPropertySection (a Server
// Component) -- see RolesTable.tsx (admin) for why.
function buildColumns(currentUserId: string): DataTableColumnDef<ListingWithOwner>[] {
  return [
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
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5">
        {row.original.title}
        {row.original.owner && row.original.owner.id !== currentUserId && (
          <Badge variant="outline" title="You're managing this for them">
            {row.original.owner.businessName ?? row.original.owner.name ?? "Managed"}
          </Badge>
        )}
      </span>
    ),
  },
  {
    accessorKey: "type",
    header: ({ column }) => <SortableHeader label="Type" column={column} />,
    cell: ({ row }) => row.original.type,
  },
  {
    accessorKey: "price",
    header: ({ column }) => <SortableHeader label="Price" column={column} />,
    cell: ({ row }) => formatMoney(row.original.price, row.original.currency),
  },
  {
    id: "reactivateBy",
    header: "Reactivate by",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-zinc-500">
        {row.original.status === "ACTIVE" && row.original.lastActivatedAt
          ? new Date(row.original.lastActivatedAt.getTime() + REACTIVATION_INTERVAL_MS).toLocaleDateString()
          : "—"}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader label="Status" column={column} />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <StatusBadge status={row.original.status} />
        {row.original.status === "INACTIVE" && <ActivateListingButton listingId={row.original.id} />}
      </div>
    ),
  },
  ];
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SOLD", label: "Sold" },
  { value: "RENTED", label: "Rented" },
  { value: "INACTIVE", label: "Inactive" },
];

export function MyListingsTable({ listings, currentUserId }: { listings: ListingWithOwner[]; currentUserId: string }) {
  const columns = useMemo(() => buildColumns(currentUserId), [currentUserId]);
  return (
    <DataTable
      minWidth="600px"
      emptyMessage="You haven't listed anything yet."
      columns={columns}
      data={listings}
      getRowSearchText={(l) => [l.title, l.type, l.status].filter(Boolean).join(" ")}
      statusFilter={{ columnId: "status", label: "status", options: STATUS_OPTIONS }}
      renderRow={(listing, cells) => (
        <ClickableRow key={listing.id} listingId={listing.id}>
          {cells}
        </ClickableRow>
      )}
    />
  );
}

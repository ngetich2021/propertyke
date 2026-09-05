"use client";

import { useMemo } from "react";
import { ClickableAdRow } from "@/components/listings/ClickableAdRow";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { parseAdMedia } from "@/lib/adMedia";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import type { Ad, Listing, User } from "@/app/generated/prisma/client";

type AdRow = Ad & { listing: Listing; owner?: User };

// Column defs (with JSX-returning cell/header functions) live here, inside
// the client boundary, rather than in AdvertiseSection (a Server
// Component) -- see RolesTable.tsx (admin) for why.
function buildColumns(currentUserId: string): DataTableColumnDef<AdRow>[] {
  return [
  {
    id: "#",
    header: "#",
    enableSorting: false,
    meta: { headerClassName: STICKY_COL_1, cellClassName: STICKY_COL_1 },
    cell: ({ row }) => row.getDisplayIndex() + 1,
  },
  {
    accessorKey: "productName",
    header: ({ column }) => <SortableHeader label="Product" column={column} />,
    meta: { headerClassName: STICKY_COL_2, cellClassName: STICKY_COL_2 },
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5">
        {row.original.productName ?? "—"}
        {row.original.owner && row.original.owner.id !== currentUserId && (
          <Badge variant="outline" title="You're managing this for them">
            {row.original.owner.businessName ?? row.original.owner.name ?? "Managed"}
          </Badge>
        )}
      </span>
    ),
  },
  {
    id: "listing",
    accessorFn: (row) => row.listing.title,
    header: ({ column }) => <SortableHeader label="Listing" column={column} />,
    cell: ({ row }) => row.original.listing.title,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <SortableHeader label="Amount" column={column} />,
    cell: ({ row }) => formatMoney(row.original.amount, row.original.listing.currency),
  },
  {
    accessorKey: "days",
    header: ({ column }) => <SortableHeader label="Days" column={column} />,
    cell: ({ row }) => row.original.days,
  },
  {
    id: "media",
    accessorFn: (row) => parseAdMedia(row.media).length,
    header: ({ column }) => <SortableHeader label="Media" column={column} />,
    cell: ({ row }) => <span className="text-zinc-500">{parseAdMedia(row.original.media).length}</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader label="Status" column={column} />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "adminNote",
    header: "Message from admin",
    enableSorting: false,
    cell: ({ row }) => <span className="text-zinc-500">{row.original.adminNote ?? "—"}</span>,
  },
  ];
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
];

export function MyAdsTable({ ads, currentUserId }: { ads: AdRow[]; currentUserId: string }) {
  const columns = useMemo(() => buildColumns(currentUserId), [currentUserId]);
  return (
    <DataTable
      minWidth="700px"
      emptyMessage="No ads yet."
      columns={columns}
      data={ads}
      getRowSearchText={(ad) => [ad.productName, ad.listing.title, ad.status].filter(Boolean).join(" ")}
      statusFilter={{ columnId: "status", label: "status", options: STATUS_OPTIONS }}
      renderRow={(ad, cells) => (
        <ClickableAdRow key={ad.id} ad={ad}>
          {cells}
        </ClickableAdRow>
      )}
    />
  );
}

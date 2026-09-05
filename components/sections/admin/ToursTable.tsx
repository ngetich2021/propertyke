"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { TourActionsMenu } from "@/components/sections/admin/TourActionsMenu";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import type { TourRequest, Listing, User } from "@/app/generated/prisma/client";

type Row = TourRequest & { listing: Listing; requester: User };

const STATUS_OPTIONS = ["REQUESTED", "CONFIRMED", "DECLINED", "DONE", "CANCELLED"].map((s) => ({ value: s, label: s }));

// Column defs (with JSX-returning cell/header functions) live here, inside
// the client boundary, rather than in ToursPanel (a Server Component) --
// see RolesTable.tsx for why.
const columns: DataTableColumnDef<Row>[] = [
  {
    id: "#",
    header: "#",
    enableSorting: false,
    meta: { headerClassName: STICKY_COL_1, cellClassName: STICKY_COL_1 },
    cell: ({ row }) => row.getDisplayIndex() + 1,
  },
  {
    id: "listing",
    accessorFn: (row) => row.listing.title,
    header: ({ column }) => <SortableHeader label="Listing" column={column} />,
    meta: { headerClassName: STICKY_COL_2, cellClassName: STICKY_COL_2 },
    cell: ({ row }) => row.original.listing.title,
  },
  {
    id: "requester",
    accessorFn: (row) => row.requester.name ?? row.requester.email,
    header: ({ column }) => <SortableHeader label="Requested by" column={column} />,
    cell: ({ row }) => (
      <span className="block max-w-35 truncate text-zinc-500">
        {row.original.requester.name ?? row.original.requester.email}
      </span>
    ),
  },
  {
    accessorKey: "preferredDate",
    header: ({ column }) => <SortableHeader label="Preferred date" column={column} />,
    cell: ({ row }) => row.original.preferredDate.toLocaleString(),
  },
  {
    id: "notes",
    header: "Notes",
    enableSorting: false,
    cell: ({ row }) => <span className="block max-w-40 truncate text-zinc-500">{row.original.notes ?? "—"}</span>,
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
        <TourActionsMenu tourId={row.original.id} currentStatus={row.original.status} />
      </div>
    ),
  },
];

export function ToursTable({ tours }: { tours: Row[] }) {
  return (
    <DataTable
      minWidth="800px"
      emptyMessage="No site visits requested yet."
      columns={columns}
      data={tours}
      getRowSearchText={(t) => [t.listing.title, t.requester.name, t.requester.email, t.status].filter(Boolean).join(" ")}
      statusFilter={{ columnId: "status", label: "status", options: STATUS_OPTIONS }}
    />
  );
}

"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { ClickableTicketRow } from "@/components/sections/admin/ClickableTicketRow";
import { slaLabel } from "@/lib/supportSla";
import type { SupportTicket, User } from "@/app/generated/prisma/client";

type Row = SupportTicket & { user: User; assignedTo: User | null; _count: { messages: number } };

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

// Column defs (with JSX-returning cell/header functions) live here, inside
// the client boundary, rather than in SupportPanel (a Server Component) --
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
    accessorKey: "subject",
    header: ({ column }) => <SortableHeader label="Subject" column={column} />,
    meta: { headerClassName: STICKY_COL_2, cellClassName: STICKY_COL_2 },
    cell: ({ row }) => (
      <span className="flex max-w-50 flex-col truncate">
        <span className="truncate">{row.original.subject}</span>
        <span className="text-xs text-zinc-500">{row.original._count.messages} messages</span>
      </span>
    ),
  },
  {
    id: "from",
    accessorFn: (row) => row.user.name ?? row.user.email,
    header: ({ column }) => <SortableHeader label="From" column={column} />,
    cell: ({ row }) => (
      <span className="block max-w-35 truncate text-zinc-500">{row.original.user.name ?? row.original.user.email}</span>
    ),
  },
  {
    id: "assignedTo",
    accessorFn: (row) => row.assignedTo?.name ?? row.assignedTo?.email ?? "",
    header: ({ column }) => <SortableHeader label="Assigned to" column={column} />,
    cell: ({ row }) => (
      <span className="text-zinc-500">{row.original.assignedTo?.name ?? row.original.assignedTo?.email ?? "Unassigned"}</span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader label="Status" column={column} />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "sla",
    header: "SLA",
    enableSorting: false,
    cell: ({ row }) => {
      const sla = slaLabel(row.original);
      return <span className={sla.breached ? "font-medium text-red-600 dark:text-red-400" : "text-zinc-500"}>{sla.text}</span>;
    },
  },
];

export function SupportTable({ tickets }: { tickets: Row[] }) {
  return (
    <DataTable
      minWidth="800px"
      emptyMessage="No support tickets yet."
      columns={columns}
      data={tickets}
      getRowSearchText={(t) => [t.subject, t.user.name, t.user.email, t.status].filter(Boolean).join(" ")}
      statusFilter={{ columnId: "status", label: "status", options: STATUS_OPTIONS }}
      renderRow={(ticket, cells) => (
        <ClickableTicketRow key={ticket.id} ticketId={ticket.id}>
          {cells}
        </ClickableTicketRow>
      )}
    />
  );
}

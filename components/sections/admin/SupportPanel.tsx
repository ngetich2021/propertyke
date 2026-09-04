import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { ClickableTicketRow } from "@/components/sections/admin/ClickableTicketRow";
import type { SupportTicket, User } from "@/app/generated/prisma/client";

type Row = SupportTicket & { user: User; assignedTo: User | null; _count: { messages: number } };

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

// A ticket breaches SLA if it's still unanswered by a human 15+ minutes
// after being opened -- matches the <15min response-time target from the
// support playbook (see SupportButton's safety-tip / lib/actions/support.ts).
const SLA_MINUTES = 15;

function slaLabel(row: Row): { text: string; breached: boolean } {
  if (row.firstStaffReplyAt) {
    const mins = Math.round((row.firstStaffReplyAt.getTime() - row.createdAt.getTime()) / 60000);
    return { text: `Replied in ${mins}m`, breached: mins > SLA_MINUTES };
  }
  const waitingMins = Math.round((Date.now() - row.createdAt.getTime()) / 60000);
  return { text: `Waiting ${waitingMins}m`, breached: waitingMins > SLA_MINUTES && row.status !== "CLOSED" };
}

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

export async function SupportPanel() {
  const tickets = await prisma.supportTicket.findMany({
    include: { user: true, assignedTo: true, _count: { select: { messages: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const openCount = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;
  const breachedCount = tickets.filter((t) => slaLabel(t).breached).length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Support tickets / live chat ({tickets.length})</h2>
      </div>
      <div className="mb-3 flex gap-4 text-sm">
        <p><span className="font-bold">{openCount}</span> open</p>
        <p><span className={breachedCount > 0 ? "font-bold text-red-600 dark:text-red-400" : "font-bold"}>{breachedCount}</span> breaching {SLA_MINUTES}m SLA</p>
      </div>
      <p className="mb-2 text-xs text-zinc-500">Click a row to read the conversation, reply, assign, or change status.</p>
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
    </div>
  );
}

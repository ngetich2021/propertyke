"use client";

import { Star } from "lucide-react";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import type { Feedback, User } from "@/app/generated/prisma/client";

type Row = Feedback & { user: User };

// Column defs (with JSX-returning cell/header functions) live here, inside
// the client boundary, rather than in FeedbackPanel (a Server Component) --
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
    id: "from",
    accessorFn: (row) => row.user.name ?? row.user.email,
    header: ({ column }) => <SortableHeader label="From" column={column} />,
    meta: { headerClassName: STICKY_COL_2, cellClassName: STICKY_COL_2 },
    cell: ({ row }) => (
      <span className="block max-w-35 truncate text-zinc-500">{row.original.user.name ?? row.original.user.email}</span>
    ),
  },
  {
    accessorKey: "rating",
    header: ({ column }) => <SortableHeader label="Rating" column={column} />,
    cell: ({ row }) =>
      row.original.rating ? (
        <span className="flex items-center gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              size={14}
              className={i < row.original.rating! ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-700"}
            />
          ))}
        </span>
      ) : (
        <span className="text-zinc-500">—</span>
      ),
  },
  {
    accessorKey: "message",
    header: "Message",
    enableSorting: false,
    cell: ({ row }) => <span className="block max-w-80 whitespace-pre-line">{row.original.message}</span>,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <SortableHeader label="Date" column={column} />,
    cell: ({ row }) => <span className="text-zinc-500">{row.original.createdAt.toLocaleDateString()}</span>,
  },
];

export function FeedbackTable({ feedback }: { feedback: Row[] }) {
  return (
    <DataTable
      minWidth="700px"
      emptyMessage="No feedback yet."
      columns={columns}
      data={feedback}
      getRowSearchText={(f) => [f.user.name, f.user.email, f.message].filter(Boolean).join(" ")}
    />
  );
}

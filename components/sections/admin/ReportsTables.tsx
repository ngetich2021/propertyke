"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { ReportActionsMenu } from "./ReportActionsMenu";
import { RevealPhoneButton } from "@/components/ui/RevealPhoneButton";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { ClickableRow } from "@/components/ui/ClickableRow";
import type { ActivityItem } from "@/lib/actions/activity";
import type { Listing, Report, User } from "@/app/generated/prisma/client";

// listing is null once the listing (or its owner's account) has been
// deleted -- the report itself still shows in the moderation history.
type ReportRow = Report & { listing: (Listing & { owner: User }) | null; reporter: User };

// Column defs (with JSX-returning cell/header functions) live here, inside
// the client boundary, rather than in ReportsPanel (a Server Component) --
// see RolesTable.tsx for why.
const activityColumns: DataTableColumnDef<ActivityItem>[] = [
  {
    id: "#",
    header: "#",
    enableSorting: false,
    meta: { headerClassName: STICKY_COL_1, cellClassName: STICKY_COL_1 },
    cell: ({ row }) => row.getDisplayIndex() + 1,
  },
  {
    accessorKey: "at",
    header: ({ column }) => <SortableHeader label="When" column={column} />,
    meta: { headerClassName: STICKY_COL_2, cellClassName: STICKY_COL_2 },
    cell: ({ row }) => <span className="text-zinc-500">{row.original.at.toLocaleString()}</span>,
  },
  {
    accessorKey: "description",
    header: "Activity",
    enableSorting: false,
    cell: ({ row }) => row.original.description,
  },
];

const REPORT_STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "DISMISSED", label: "Dismissed" },
];

const reportColumns: DataTableColumnDef<ReportRow>[] = [
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
    id: "listingOwner",
    accessorFn: (row) => row.listing?.owner.email ?? "Account deleted",
    header: ({ column }) => <SortableHeader label="Listing owner" column={column} />,
    cell: ({ row }) =>
      row.original.listing ? (
        <div className="text-zinc-500">
          <div>{row.original.listing.owner.email}</div>
          {row.original.listing.owner.phone && (
            <RevealPhoneButton phone={row.original.listing.owner.phone} className="underline" />
          )}
        </div>
      ) : (
        <span className="text-zinc-500">Account deleted</span>
      ),
  },
  {
    id: "reporter",
    accessorFn: (row) => row.reporter.email,
    header: ({ column }) => <SortableHeader label="Reporter" column={column} />,
    cell: ({ row }) => (
      <div className="text-zinc-500">
        <div>{row.original.reporter.email}</div>
        {row.original.reporter.phone && (
          <RevealPhoneButton phone={row.original.reporter.phone} className="underline" />
        )}
      </div>
    ),
  },
  {
    accessorKey: "reason",
    header: "Reason",
    enableSorting: false,
    cell: ({ row }) => <span className="italic">&ldquo;{row.original.reason}&rdquo;</span>,
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
    cell: ({ row }) =>
      row.original.status === "OPEN" && (
        <div className="flex justify-end">
          <ReportActionsMenu reportId={row.original.id} />
        </div>
      ),
  },
];

export function ReportsTables({ activity, reports }: { activity: ActivityItem[]; reports: ReportRow[] }) {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">System activity</h2>
        <DataTable
          minWidth="500px"
          emptyMessage="No activity yet."
          columns={activityColumns}
          data={activity}
          getRowSearchText={(item) => item.description}
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">User reports ({reports.length})</h2>
          <DownloadExcelLink dataset="reports" />
        </div>
        <p className="mb-2 text-xs text-zinc-500">Click a row to open the reported listing.</p>
        <DataTable
          minWidth="900px"
          emptyMessage="No reports."
          columns={reportColumns}
          data={reports}
          getRowSearchText={(report) =>
            [report.listing?.title, report.listing?.owner.email, report.reporter.email, report.reason, report.status]
              .filter(Boolean)
              .join(" ")
          }
          statusFilter={{ columnId: "status", label: "status", options: REPORT_STATUS_OPTIONS }}
          renderRow={(report, cells) => (
            <ClickableRow key={report.id} listingId={report.listingId}>
              {cells}
            </ClickableRow>
          )}
        />
      </section>
    </div>
  );
}

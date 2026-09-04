import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ReportStatusForm } from "./ReportStatusForm";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { ClickableRow } from "@/components/ui/ClickableRow";
import { getRecentActivity, type ActivityItem } from "@/lib/actions/activity";
import type { Listing, Report, User } from "@/app/generated/prisma/client";

type ReportRow = Report & { listing: Listing & { owner: User }; reporter: User };

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
    accessorFn: (row) => row.listing.title,
    header: ({ column }) => <SortableHeader label="Listing" column={column} />,
    meta: { headerClassName: STICKY_COL_2, cellClassName: STICKY_COL_2 },
    cell: ({ row }) => row.original.listing.title,
  },
  {
    id: "listingOwner",
    accessorFn: (row) => row.listing.owner.email,
    header: ({ column }) => <SortableHeader label="Listing owner" column={column} />,
    cell: ({ row }) => (
      <div className="text-zinc-500">
        <div>{row.original.listing.owner.email}</div>
        {row.original.listing.owner.phone && (
          <a href={`tel:${row.original.listing.owner.phone}`} className="underline">
            📞 {row.original.listing.owner.phone}
          </a>
        )}
      </div>
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
          <a href={`tel:${row.original.reporter.phone}`} className="underline">
            📞 {row.original.reporter.phone}
          </a>
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
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.status === "OPEN" && (
        <div className="flex gap-2">
          <ReportStatusForm reportId={row.original.id} status="RESOLVED" />
          <ReportStatusForm reportId={row.original.id} status="DISMISSED" />
        </div>
      ),
  },
];

export async function ReportsPanel() {
  const [reports, activity] = await Promise.all([
    prisma.report.findMany({
      include: { listing: { include: { owner: true } }, reporter: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getRecentActivity(30),
  ]);

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
            [report.listing.title, report.listing.owner.email, report.reporter.email, report.reason, report.status]
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

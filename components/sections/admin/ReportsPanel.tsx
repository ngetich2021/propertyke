import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ReportStatusForm } from "./ReportStatusForm";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { PaginatedTable, STICKY_COL_1, STICKY_COL_2 } from "@/components/ui/PaginatedTable";
import { ClickableRow } from "@/components/ui/ClickableRow";
import { getRecentActivity } from "@/lib/actions/activity";

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
        <PaginatedTable
          minWidth="500px"
          emptyMessage="No activity yet."
          head={
            <tr>
              <th className={`py-2 ${STICKY_COL_1}`}>#</th>
              <th className={`py-2 ${STICKY_COL_2}`}>When</th>
              <th className="py-2">Activity</th>
            </tr>
          }
          rows={activity.map((item, idx) => (
            <tr key={item.id} className="border-t border-zinc-100 dark:border-zinc-900">
              <td className={`py-2 ${STICKY_COL_1}`}>{idx + 1}</td>
              <td className={`py-2 text-zinc-500 ${STICKY_COL_2}`}>
                {item.at.toLocaleString()}
              </td>
              <td className="py-2">{item.description}</td>
            </tr>
          ))}
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">User reports ({reports.length})</h2>
          <DownloadExcelLink dataset="reports" />
        </div>
        <p className="mb-2 text-xs text-zinc-500">Click a row to open the reported listing.</p>
        <PaginatedTable
          minWidth="900px"
          emptyMessage="No reports."
          head={
            <tr>
              <th className={`py-2 ${STICKY_COL_1}`}>#</th>
              <th className={`py-2 ${STICKY_COL_2}`}>Listing</th>
              <th className="py-2">Listing owner</th>
              <th className="py-2">Reporter</th>
              <th className="py-2">Reason</th>
              <th className="py-2">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          }
          rows={reports.map((report, idx) => (
            <ClickableRow key={report.id} listingId={report.listingId}>
              <td className={`py-2 ${STICKY_COL_1}`}>{idx + 1}</td>
              <td className={`py-2 ${STICKY_COL_2}`}>{report.listing.title}</td>
              <td className="py-2 text-zinc-500">
                <div>{report.listing.owner.email}</div>
                {report.listing.owner.phone && (
                  <a
                    href={`tel:${report.listing.owner.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="underline"
                  >
                    📞 {report.listing.owner.phone}
                  </a>
                )}
              </td>
              <td className="py-2 text-zinc-500">
                <div>{report.reporter.email}</div>
                {report.reporter.phone && (
                  <a
                    href={`tel:${report.reporter.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="underline"
                  >
                    📞 {report.reporter.phone}
                  </a>
                )}
              </td>
              <td className="py-2 italic">&ldquo;{report.reason}&rdquo;</td>
              <td className="py-2">
                <StatusBadge status={report.status} />
              </td>
              <td className="py-2" onClick={(e) => e.stopPropagation()}>
                {report.status === "OPEN" && (
                  <div className="flex gap-2">
                    <ReportStatusForm reportId={report.id} status="RESOLVED" />
                    <ReportStatusForm reportId={report.id} status="DISMISSED" />
                  </div>
                )}
              </td>
            </ClickableRow>
          ))}
        />
      </section>
    </div>
  );
}

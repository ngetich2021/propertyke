import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const STUCK_PAYMENT_MS = 15 * 60 * 1000;

// Kept as plain module-level helpers (not inlined in the component) so
// "now" is computed once per call site rather than the component reading
// the clock directly during render.
function msAgo(ms: number): Date {
  return new Date(Date.now() - ms);
}

// The "audit dashboard": ticket SLA health + the raw system issue log (see
// lib/systemHealth.ts) that also feeds the every-6h email digest
// (app/api/cron/health/route.ts) and immediate ERROR alerts.
export async function HealthPanel() {
  const [openTickets, recentTickets, pendingTours, issues, pendingPayments] = await Promise.all([
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.supportTicket.findMany({
      where: { createdAt: { gte: msAgo(SEVEN_DAYS_MS) } },
      select: { createdAt: true, firstStaffReplyAt: true },
    }),
    prisma.tourRequest.count({ where: { status: "REQUESTED" } }),
    prisma.systemIssue.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.payment.count({ where: { status: "PENDING", createdAt: { lt: msAgo(STUCK_PAYMENT_MS) } } }),
  ]);

  const answered = recentTickets.filter((t) => t.firstStaffReplyAt);
  const avgResponseMin = answered.length
    ? Math.round(
        answered.reduce((sum, t) => sum + (t.firstStaffReplyAt!.getTime() - t.createdAt.getTime()), 0) /
          answered.length /
          60000
      )
    : null;
  const nowMs = msAgo(0).getTime();
  const breached = recentTickets.filter((t) => {
    const wait = ((t.firstStaffReplyAt?.getTime() ?? nowMs) - t.createdAt.getTime()) / 60000;
    return wait > 15;
  }).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold">System health</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Open tickets" value={openTickets} />
          <Stat label="Avg. first response (7d)" value={avgResponseMin != null ? `${avgResponseMin}m` : "—"} />
          <Stat label="SLA breaches (7d)" value={breached} warn={breached > 0} />
          <Stat label="Site visits awaiting reply" value={pendingTours} />
          <Stat label="Payments stuck 15m+" value={pendingPayments} warn={pendingPayments > 0} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Recent issues</h3>
        {issues.length === 0 ? (
          <p className="text-sm text-zinc-500">No issues logged. Digest emails go to the configured alert address every 6h regardless.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {issues.map((issue) => (
              <div key={issue.id} className="rounded-md border border-zinc-200 p-2 text-sm dark:border-zinc-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <StatusBadge status={issue.severity} />
                    <span className="font-medium">{issue.source}</span>
                  </span>
                  <span className="text-xs text-zinc-500">{issue.createdAt.toLocaleString()}</span>
                </div>
                <p className="mt-1">{issue.message}</p>
                {issue.detail && (
                  <pre className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap text-xs text-zinc-500">{issue.detail}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-xl font-bold ${warn ? "text-red-600 dark:text-red-400" : ""}`}>{value}</p>
    </div>
  );
}

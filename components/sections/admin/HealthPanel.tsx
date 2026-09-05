import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getProviderHealth, type ProviderName } from "@/lib/providerHealth";
import { ProviderHealthRefreshButton } from "@/components/sections/admin/ProviderHealthRefreshButton";
import type { IssueSeverity } from "@/app/generated/prisma/client";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const STUCK_PAYMENT_MS = 15 * 60 * 1000;

// Kept as plain module-level helpers (not inlined in the component) so
// "now" is computed once per call site rather than the component reading
// the clock directly during render.
function msAgo(ms: number): Date {
  return new Date(Date.now() - ms);
}

function nowMs(): number {
  return Date.now();
}

const PROVIDER_LABEL: Record<ProviderName, string> = { gemini: "Gemini", groq: "Groq" };

// The "audit dashboard": live infra checks (DB latency, AI provider
// reachability), traffic (active sessions, new signups), ticket SLA health,
// an issue-rate trend, and the raw system issue log (see lib/systemHealth.ts)
// that also feeds the every-6h email digest (app/api/cron/health/route.ts)
// and immediate ERROR alerts.
export async function HealthPanel() {
  // Timed directly rather than reused from elsewhere -- this is what "is the
  // database reachable and how slow is it, right now" actually means: a real
  // round trip run at the moment the page is viewed, not a cached number.
  const dbStart = nowMs();
  const [
    openTickets,
    recentTickets,
    pendingTours,
    issues,
    issuesLast7d,
    pendingPayments,
    activeSessions,
    newUsers24h,
    newUsers7d,
  ] = await Promise.all([
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.supportTicket.findMany({
      where: { createdAt: { gte: msAgo(SEVEN_DAYS_MS) } },
      select: { createdAt: true, firstStaffReplyAt: true },
    }),
    prisma.tourRequest.count({ where: { status: "REQUESTED" } }),
    prisma.systemIssue.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.systemIssue.findMany({
      where: { createdAt: { gte: msAgo(SEVEN_DAYS_MS) } },
      select: { severity: true, createdAt: true },
    }),
    prisma.payment.count({ where: { status: "PENDING", createdAt: { lt: msAgo(STUCK_PAYMENT_MS) } } }),
    // NextAuth's database session strategy is the only "who's around right
    // now" signal this app has -- there's no anonymous-visitor tracking, so
    // "recent visitors" here honestly means signed-in users, not raw traffic.
    prisma.session.count({ where: { expires: { gt: new Date() } } }),
    prisma.user.count({ where: { createdAt: { gte: msAgo(ONE_DAY_MS) } } }),
    prisma.user.count({ where: { createdAt: { gte: msAgo(SEVEN_DAYS_MS) } } }),
  ]);
  const dbLatencyMs = nowMs() - dbStart;
  const providers = await getProviderHealth();

  const answered = recentTickets.filter((t) => t.firstStaffReplyAt);
  const avgResponseMin = answered.length
    ? Math.round(
        answered.reduce((sum, t) => sum + (t.firstStaffReplyAt!.getTime() - t.createdAt.getTime()), 0) /
          answered.length /
          60000
      )
    : null;
  const now = nowMs();
  const breached = recentTickets.filter((t) => {
    const wait = ((t.firstStaffReplyAt?.getTime() ?? now) - t.createdAt.getTime()) / 60000;
    return wait > 15;
  }).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold">System health</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Database latency" value={`${dbLatencyMs}ms`} warn={dbLatencyMs > 1000} />
          <Stat label="Signed in now" value={activeSessions} />
          <Stat label="New users (24h)" value={newUsers24h} />
          <Stat label="New users (7d)" value={newUsers7d} />
          <Stat label="Open tickets" value={openTickets} />
          <Stat label="Avg. first response (7d)" value={avgResponseMin != null ? `${avgResponseMin}m` : "—"} />
          <Stat label="SLA breaches (7d)" value={breached} warn={breached > 0} />
          <Stat label="Site visits awaiting reply" value={pendingTours} />
          <Stat label="Payments stuck 15m+" value={pendingPayments} warn={pendingPayments > 0} />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">AI provider reachability</h3>
          <ProviderHealthRefreshButton />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(["gemini", "groq"] as const).map((name) => {
            const check = providers[name];
            return (
              <div key={name} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{PROVIDER_LABEL[name]}</p>
                  {check ? (
                    <StatusBadge status={check.ok ? "ONLINE" : "OFFLINE"} />
                  ) : (
                    <span className="text-xs text-zinc-500">never checked</span>
                  )}
                </div>
                {check && (
                  <>
                    {check.ok ? (
                      <p className="mt-1 text-xs text-zinc-500">{check.latencyMs}ms</p>
                    ) : (
                      <p className="mt-1 line-clamp-2 text-xs text-red-600 dark:text-red-400" title={check.detail ?? undefined}>
                        {check.detail}
                      </p>
                    )}
                    <p className="text-xs text-zinc-400">Checked {check.checkedAt.toLocaleString()}</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ErrorTrendChart issues={issuesLast7d} />

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

const SEVERITY_FILL: Record<IssueSeverity, string> = {
  ERROR: "fill-red-500",
  WARNING: "fill-amber-500",
  INFO: "fill-blue-500",
};

// Groups the last 7 days of SystemIssue rows into one stacked bar per day.
// A pure module-level function (not inlined in the component) -- see
// lib/supportSla.ts's note on why Date.now()-based helpers live outside the
// component body.
function bucketByDay(issues: { severity: IssueSeverity; createdAt: Date }[]) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(msAgo((6 - i) * ONE_DAY_MS));
    d.setHours(0, 0, 0, 0);
    return { date: d, ERROR: 0, WARNING: 0, INFO: 0 };
  });
  for (const issue of issues) {
    const d = new Date(issue.createdAt);
    d.setHours(0, 0, 0, 0);
    const bucket = days.find((b) => b.date.getTime() === d.getTime());
    if (bucket) bucket[issue.severity]++;
  }
  return days;
}

// A small hand-rolled stacked bar chart (no charting library, matching this
// app's otherwise-dependency-light UI) -- severity is a status encoding
// (reserved red/amber/blue, same as StatusBadge elsewhere), not an arbitrary
// categorical palette, and each segment carries a native <title> tooltip
// plus the legend spells out color -> meaning so nothing here is color-alone.
function ErrorTrendChart({ issues }: { issues: { severity: IssueSeverity; createdAt: Date }[] }) {
  const days = bucketByDay(issues);
  const max = Math.max(1, ...days.map((d) => d.ERROR + d.WARNING + d.INFO));
  const chartHeight = 80;
  const barWidth = 28;
  const gap = 14;
  const width = days.length * (barWidth + gap);

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">Issue trend (7 days)</h3>
      {issues.length === 0 ? (
        <p className="text-sm text-zinc-500">No issues logged in the last 7 days.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <svg viewBox={`0 0 ${width} ${chartHeight + 20}`} className="h-32 w-full max-w-md" role="img" aria-label="Logged issues per day for the last 7 days, by severity">
            {days.map((d, i) => {
              const x = i * (barWidth + gap);
              const total = d.ERROR + d.WARNING + d.INFO;
              const segments = (
                [
                  { key: "ERROR", count: d.ERROR },
                  { key: "WARNING", count: d.WARNING },
                  { key: "INFO", count: d.INFO },
                ] as const
              ).filter((s) => s.count > 0);

              let yCursor = chartHeight;
              return (
                <g key={i}>
                  {segments.map((s, si) => {
                    const h = Math.max(2, (s.count / max) * chartHeight - (segments.length > 1 ? 2 : 0));
                    yCursor -= h + (si > 0 ? 2 : 0);
                    const isTop = si === segments.length - 1;
                    return (
                      <rect
                        key={s.key}
                        x={x}
                        y={yCursor}
                        width={barWidth}
                        height={h}
                        rx={isTop ? 4 : 0}
                        className={SEVERITY_FILL[s.key]}
                      >
                        <title>
                          {d.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}:{" "}
                          {s.count} {s.key.toLowerCase()}
                        </title>
                      </rect>
                    );
                  })}
                  {total === 0 && (
                    <rect x={x} y={chartHeight - 2} width={barWidth} height={2} rx={1} className="fill-zinc-200 dark:fill-zinc-800" />
                  )}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 14}
                    textAnchor="middle"
                    className="fill-zinc-500 text-[9px]"
                  >
                    {d.date.toLocaleDateString(undefined, { weekday: "narrow" })}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="flex gap-3 text-xs text-zinc-500">
            <Legend swatchClassName="bg-red-500" label="Error" />
            <Legend swatchClassName="bg-amber-500" label="Warning" />
            <Legend swatchClassName="bg-blue-500" label="Info" />
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ swatchClassName, label }: { swatchClassName: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${swatchClassName}`} />
      {label}
    </span>
  );
}

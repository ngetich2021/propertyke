import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { getAlertEmail } from "@/lib/systemHealth";
import { refreshProviderHealth, getProviderHealth } from "@/lib/providerHealth";

const SLA_MINUTES = 15;
const STUCK_PAYMENT_MINUTES = 15;

// Vercel Cron (see vercel.json, schedule "0 */6 * * *") hits this every 6h.
// When CRON_SECRET is set, Vercel automatically sends it as this Bearer
// token on cron-triggered requests -- checking it stops anyone else from
// triggering (and spamming) the digest email by just hitting the URL.
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured locally -- allow (matches sendMail's opt-in-by-config pattern)
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const to = getAlertEmail();
  if (!to) {
    return NextResponse.json({ skipped: "ADMIN_ALERT_EMAIL not configured" });
  }

  try {
    // Refreshes ProviderHealthCheck (see lib/providerHealth.ts) so the
    // dashboard always has a reasonably fresh snapshot without itself
    // making live API calls on every view.
    await refreshProviderHealth();

    const dbStart = Date.now();
    const [openTickets, recentTickets, pendingTours, unnotifiedIssues, stuckPayments, ticketTotal] = await Promise.all([
      prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.supportTicket.findMany({
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        select: { id: true, subject: true, createdAt: true, firstStaffReplyAt: true },
      }),
      prisma.tourRequest.count({ where: { status: "REQUESTED" } }),
      prisma.systemIssue.findMany({ where: { notifiedAt: null }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.payment.count({
        where: { status: "PENDING", createdAt: { lt: new Date(Date.now() - STUCK_PAYMENT_MINUTES * 60 * 1000) } },
      }),
      prisma.supportTicket.count(),
    ]);
    const dbLatencyMs = Date.now() - dbStart;
    const providers = await getProviderHealth();

    const breached = recentTickets.filter(
      (t) => ((t.firstStaffReplyAt ?? new Date()).getTime() - t.createdAt.getTime()) / 60000 > SLA_MINUTES
    );

    const errorCount = unnotifiedIssues.filter((i) => i.severity === "ERROR").length;
    const warningCount = unnotifiedIssues.filter((i) => i.severity === "WARNING").length;

    const html = `
      <h2>EstateFinderHub system health (daily)</h2>
      <p>Database: reachable, ${dbLatencyMs}ms. Total tickets ever: ${ticketTotal}.</p>
      <ul>
        <li>Gemini: ${providers.gemini ? (providers.gemini.ok ? `reachable, ${providers.gemini.latencyMs}ms` : `<strong>DOWN</strong> (${providers.gemini.detail})`) : "never checked"}</li>
        <li>Groq: ${providers.groq ? (providers.groq.ok ? `reachable, ${providers.groq.latencyMs}ms` : `<strong>DOWN</strong> (${providers.groq.detail})`) : "never checked"}</li>
        <li>Open/in-progress tickets: <strong>${openTickets}</strong></li>
        <li>Tickets breaching ${SLA_MINUTES}-minute first-response SLA: <strong>${breached.length}</strong>${
      breached.length ? `<ul>${breached.map((t) => `<li>${t.subject}</li>`).join("")}</ul>` : ""
    }</li>
        <li>Site visits awaiting a reply: <strong>${pendingTours}</strong></li>
        <li>Payments stuck PENDING ${STUCK_PAYMENT_MINUTES}+ minutes: <strong>${stuckPayments}</strong></li>
        <li>New logged issues since last digest: <strong>${unnotifiedIssues.length}</strong> (${errorCount} error, ${warningCount} warning)</li>
      </ul>
      ${
        unnotifiedIssues.length
          ? `<h3>Issues</h3><ul>${unnotifiedIssues
              .map((i) => `<li>[${i.severity}] ${i.source}: ${i.message}</li>`)
              .join("")}</ul>`
          : "<p>No new issues logged since the last digest.</p>"
      }
      <p style="color:#888;font-size:12px">Sent ${new Date().toISOString()}</p>`;

    await sendMail(to, `[EstateFinderHub] System health -- ${openTickets} open, ${stuckPayments} stuck payments, ${errorCount} errors`, html);

    if (unnotifiedIssues.length) {
      await prisma.systemIssue.updateMany({
        where: { id: { in: unnotifiedIssues.map((i) => i.id) } },
        data: { notifiedAt: new Date() },
      });
    }

    return NextResponse.json({ sent: true, openTickets, breached: breached.length, stuckPayments, issues: unnotifiedIssues.length });
  } catch (error) {
    // The DB query itself failed -- that's the health check finding the
    // worst possible result, so still get an email out even though we can't
    // log it as a SystemIssue row (the DB is what's unreachable).
    await sendMail(
      to,
      "[EstateFinderHub] System health check FAILED",
      `<p>The daily health check itself failed, which likely means the database is unreachable.</p>
       <pre>${error instanceof Error ? error.stack ?? error.message : String(error)}</pre>`
    );
    return NextResponse.json({ error: "Health check failed" }, { status: 500 });
  }
}

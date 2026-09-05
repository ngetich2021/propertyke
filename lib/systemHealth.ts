import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import type { IssueSeverity } from "@/app/generated/prisma/client";

// Where both the every-6h digest (app/api/cron/health/route.ts) and
// immediate ERROR alerts (below) are sent. No separate opt-in flag: if this
// isn't set, alerting is silently a no-op, same contract as sendMail without
// GMAIL_USER/PASS.
export function getAlertEmail(): string | null {
  return process.env.ADMIN_ALERT_EMAIL || null;
}

// Records an entry in the health log. ERROR fires an immediate email
// (fire-and-forget via `after`, so it never slows down the request/action
// that hit the problem) -- INFO/WARNING just accumulate for the 6h digest.
// Called from the app's actual failure points (M-Pesa callback processing,
// applying a paid action, support chat) rather than every possible error,
// so alerts stay meaningful instead of noisy.
//
// Deliberately never throws -- the whole point of this function is to
// report a problem, so a failure *inside it* (e.g. the DB itself is what's
// down) must not become a second, uncaught error on top of the one being
// reported. The DB write and the email are independent best-effort attempts:
// either can fail without blocking the other, matching sendMail's contract.
export async function logIssue(
  severity: IssueSeverity,
  source: string,
  message: string,
  detail?: string
) {
  const now = new Date();

  if (severity === "ERROR") {
    const to = getAlertEmail();
    if (to) {
      after(() =>
        sendMail(
          to,
          `[PropertyKE] Issue: ${message}`,
          `<p><strong>Source:</strong> ${source}</p>
           <p><strong>Message:</strong> ${message}</p>
           ${detail ? `<pre style="white-space:pre-wrap;font-size:12px">${escapeHtml(detail)}</pre>` : ""}
           <p style="color:#888;font-size:12px">Reported ${now.toISOString()}</p>`
        )
      );
    }
  }

  try {
    return await prisma.systemIssue.create({ data: { severity, source, message, detail } });
  } catch (error) {
    console.error("logIssue: failed to persist SystemIssue row", error);
    return null;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

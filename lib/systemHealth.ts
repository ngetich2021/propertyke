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
// Called from the app's actual revenue-critical failure points (M-Pesa
// callback processing, applying a paid action) rather than every possible
// error, so alerts stay meaningful instead of noisy.
export async function logIssue(
  severity: IssueSeverity,
  source: string,
  message: string,
  detail?: string
) {
  const issue = await prisma.systemIssue.create({
    data: { severity, source, message, detail },
  });

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
           <p style="color:#888;font-size:12px">Reported ${issue.createdAt.toISOString()}</p>`
        )
      );
    }
  }

  return issue;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

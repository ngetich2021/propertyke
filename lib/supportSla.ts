// Plain helper shared by SupportPanel (Server Component, computes counts)
// and SupportTable (Client Component, renders the per-row badge) -- it must
// live in a file without "use client", since every export of a client
// module becomes a client reference that server code can't call directly
// (see MyListingsTable.tsx / lib/listingActivationConstants.ts for the same
// split, done for the same reason).
import type { SupportTicket } from "@/app/generated/prisma/client";

// A ticket breaches SLA if it's still unanswered by a human 15+ minutes
// after being opened -- matches the <15min response-time target from the
// support playbook (see SupportButton's safety-tip / lib/actions/support.ts).
export const SLA_MINUTES = 15;

export function slaLabel(ticket: Pick<SupportTicket, "firstStaffReplyAt" | "createdAt" | "status">): {
  text: string;
  breached: boolean;
} {
  if (ticket.firstStaffReplyAt) {
    const mins = Math.round((ticket.firstStaffReplyAt.getTime() - ticket.createdAt.getTime()) / 60000);
    return { text: `Replied in ${mins}m`, breached: mins > SLA_MINUTES };
  }
  const waitingMins = Math.round((Date.now() - ticket.createdAt.getTime()) / 60000);
  return { text: `Waiting ${waitingMins}m`, breached: waitingMins > SLA_MINUTES && ticket.status !== "CLOSED" };
}

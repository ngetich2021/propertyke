-- Manual incremental migration: explicit "this ticket needs a human" flag
-- (see lib/actions/support.ts), distinct from aiResolved staying false
-- (which also covers "no AI verdict yet"). Protects an escalated/assigned/
-- staff-answered ticket from being deleted on chat-close or by the
-- resolved-ticket cleanup sweep.
ALTER TABLE "SupportTicket" ADD COLUMN "needsHuman" BOOLEAN NOT NULL DEFAULT false;

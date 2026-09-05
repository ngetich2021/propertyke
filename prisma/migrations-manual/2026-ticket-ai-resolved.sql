-- Manual incremental migration: tracks whether a SupportTicket was fully
-- resolved by the AI alone (no human needed) -- see lib/actions/support.ts.
-- Such tickets are deleted after a short grace period instead of being kept
-- around; anything else (a human had to help) is retained.
ALTER TABLE "SupportTicket" ADD COLUMN "aiResolved" BOOLEAN NOT NULL DEFAULT false;

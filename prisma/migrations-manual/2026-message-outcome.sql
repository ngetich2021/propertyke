-- Manual incremental migration: short outcome label ("answered"/"clarify")
-- on AI/SYSTEM SupportMessage rows, alongside (not instead of) the full
-- text -- see lib/actions/support.ts runAiFollowUp.
ALTER TABLE "SupportMessage" ADD COLUMN "outcome" TEXT;

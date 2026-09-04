-- Manual incremental migration: per-user delegated admin duties (see
-- lib/permissions.ts). JSON-encoded string[] of AdminSectionKey values,
-- same shortcut used for `images`/`media` elsewhere.
ALTER TABLE "User" ADD COLUMN "permissions" TEXT NOT NULL DEFAULT '[]';

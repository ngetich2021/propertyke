-- Manual incremental migration (schema engine can't diff against live Turso state directly)
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "Ad" ADD COLUMN "videoUrl" TEXT;

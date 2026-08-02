-- Manual incremental migration: ad repeat-playback pricing fields.
ALTER TABLE "Ad" ADD COLUMN "repeatEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ad" ADD COLUMN "repeatCount" INTEGER;

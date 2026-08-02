-- Manual incremental migration: ad geo-targeting + admin approval notes.
ALTER TABLE "Ad" ADD COLUMN "targetMode" TEXT NOT NULL DEFAULT 'EVERYWHERE';
ALTER TABLE "Ad" ADD COLUMN "targetLatitude" REAL;
ALTER TABLE "Ad" ADD COLUMN "targetLongitude" REAL;
ALTER TABLE "Ad" ADD COLUMN "targetRadiusKm" REAL;
ALTER TABLE "Ad" ADD COLUMN "adminNote" TEXT;

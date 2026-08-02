-- Manual incremental migration: day-based paid duration + auto-expiry for
-- Listing and Ad (see lib/actions/maintenance.ts cleanupExpiredListings /
-- cleanupExpiredAds, lib/listingPricing.ts, lib/adPricing.ts).
ALTER TABLE "Listing" ADD COLUMN "days" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Listing" ADD COLUMN "feeAmount" REAL;
ALTER TABLE "Listing" ADD COLUMN "startDate" DATETIME;
ALTER TABLE "Listing" ADD COLUMN "endDate" DATETIME;

ALTER TABLE "Ad" ADD COLUMN "days" INTEGER NOT NULL DEFAULT 1;

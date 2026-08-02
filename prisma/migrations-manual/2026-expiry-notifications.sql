-- Manual incremental migration: throttling field for the "about to expire"
-- reminder emails (see notifyExpiringListings/notifyExpiringAds in
-- lib/actions/maintenance.ts).
ALTER TABLE "Listing" ADD COLUMN "expiryNotifiedAt" DATETIME;
ALTER TABLE "Ad" ADD COLUMN "expiryNotifiedAt" DATETIME;

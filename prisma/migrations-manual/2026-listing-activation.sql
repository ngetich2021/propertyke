-- Manual incremental migration: recurring 10-day listing re-activation,
-- independent of the paid days/endDate window (see lib/listingActivation.ts,
-- notifyReactivationNeeded/deactivateUnrenewedListings in
-- lib/actions/maintenance.ts). No column change is needed for the new
-- INACTIVE ListingStatus value itself -- status is stored as plain TEXT.
ALTER TABLE "Listing" ADD COLUMN "lastActivatedAt" DATETIME;
ALTER TABLE "Listing" ADD COLUMN "activationToken" TEXT;
ALTER TABLE "Listing" ADD COLUMN "reactivationNotifiedAt" DATETIME;
CREATE UNIQUE INDEX "Listing_activationToken_key" ON "Listing"("activationToken");

-- Backfill: existing live listings get credit for their original approval
-- date instead of being treated as never-activated.
UPDATE "Listing" SET "lastActivatedAt" = "startDate" WHERE "status" = 'ACTIVE' AND "startDate" IS NOT NULL;

-- Manual incremental migration: self-serve paid user verification badge
-- (see lib/verificationPricing.ts, lib/actions/verification.ts). No column
-- change needed for the new VERIFICATION PaymentPurpose value itself --
-- purpose is stored as plain TEXT, same shortcut used for ListingStatus
-- INACTIVE previously.
ALTER TABLE "User" ADD COLUMN "verifiedUntil" DATETIME;

-- Manual incremental migration: business name shown as "Listed by" on a
-- user's listings and used to auto-fill an ad's company name (see
-- SettingsSection, ListingDetailModal, AdForm).
ALTER TABLE "User" ADD COLUMN "businessName" TEXT;

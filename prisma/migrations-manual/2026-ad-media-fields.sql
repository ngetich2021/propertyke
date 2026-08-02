-- Manual incremental migration: replace Ad.videoUrl with richer ad-creative fields.
ALTER TABLE "Ad" DROP COLUMN "videoUrl";
ALTER TABLE "Ad" ADD COLUMN "companyName" TEXT;
ALTER TABLE "Ad" ADD COLUMN "productName" TEXT;
ALTER TABLE "Ad" ADD COLUMN "productDescription" TEXT;
ALTER TABLE "Ad" ADD COLUMN "companyContact" TEXT;
ALTER TABLE "Ad" ADD COLUMN "media" TEXT NOT NULL DEFAULT '[]';

-- Manual incremental migration: Order/Report/TourRequest.listingId becomes
-- nullable, and the FK to Listing switches from ON DELETE CASCADE to ON
-- DELETE SET NULL. Previously, deleting a listing (directly, or as a
-- cascade of its owner deleting their account) silently deleted every
-- order/report/tour request another user had made against it too --
-- wiping a buyer's own order history, and an admin's moderation trail,
-- because of the seller's action. Now the listing reference is just
-- cleared; the record itself (buyerId/reporterId/requesterId, amount,
-- status, contact info, timestamps) survives. buyerId/reporterId/
-- requesterId stay ON DELETE CASCADE unchanged -- if THAT user (the buyer,
-- reporter, or requester) deletes their own account, their own records
-- still go with it, same as before.
--
-- SQLite can't ALTER a column's nullability or a foreign key's ON DELETE
-- clause in place, so each table is rebuilt via the standard
-- create-copy-drop-rename procedure.
PRAGMA foreign_keys=OFF;

-- Order
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT,
    "buyerId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "contactPhone" TEXT NOT NULL,
    "contactMethod" TEXT NOT NULL DEFAULT 'CALL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("id","listingId","buyerId","amount","status","message","contactPhone","contactMethod","createdAt","updatedAt")
  SELECT "id","listingId","buyerId","amount","status","message","contactPhone","contactMethod","createdAt","updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_listingId_idx" ON "Order"("listingId");
CREATE INDEX "Order_buyerId_idx" ON "Order"("buyerId");

-- Report
CREATE TABLE "new_Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Report_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Report" ("id","listingId","reporterId","reason","status","createdAt","updatedAt")
  SELECT "id","listingId","reporterId","reason","status","createdAt","updatedAt" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
CREATE INDEX "Report_listingId_idx" ON "Report"("listingId");
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- TourRequest
CREATE TABLE "new_TourRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT,
    "requesterId" TEXT NOT NULL,
    "preferredDate" DATETIME NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TourRequest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TourRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TourRequest" ("id","listingId","requesterId","preferredDate","notes","status","createdAt","updatedAt")
  SELECT "id","listingId","requesterId","preferredDate","notes","status","createdAt","updatedAt" FROM "TourRequest";
DROP TABLE "TourRequest";
ALTER TABLE "new_TourRequest" RENAME TO "TourRequest";
CREATE INDEX "TourRequest_listingId_idx" ON "TourRequest"("listingId");
CREATE INDEX "TourRequest_requesterId_idx" ON "TourRequest"("requesterId");
CREATE INDEX "TourRequest_status_idx" ON "TourRequest"("status");

PRAGMA foreign_keys=ON;

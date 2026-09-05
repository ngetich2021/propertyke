-- Manual incremental migration: named, reusable Role entities an ADMIN can
-- create once and assign to any number of USER accounts (see roleId on
-- User, lib/actions/customRoles.ts), as an alternative to picking ad-hoc
-- `permissions` per person one at a time.
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

ALTER TABLE "User" ADD COLUMN "roleId" TEXT REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

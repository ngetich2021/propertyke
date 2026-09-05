-- Manual incremental migration: two independent invite systems.
--
-- StaffInvite: an ADMIN invites someone (by email) to join as staff with a
-- given site-wide role/duty set -- accepted automatically the moment that
-- email signs in (see lib/invites.ts).
--
-- OwnerInvite / OwnerDelegation: any individual account can invite someone
-- to help manage THAT account's own listings/ads/orders -- entirely
-- independent of the admin Role/StaffInvite system above.
CREATE TABLE "StaffInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "roleId" TEXT,
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "revokedAt" DATETIME,
    CONSTRAINT "StaffInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffInvite_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StaffInvite_token_key" ON "StaffInvite"("token");
CREATE INDEX "StaffInvite_email_idx" ON "StaffInvite"("email");

CREATE TABLE "OwnerInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "revokedAt" DATETIME,
    CONSTRAINT "OwnerInvite_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OwnerInvite_token_key" ON "OwnerInvite"("token");
CREATE INDEX "OwnerInvite_email_idx" ON "OwnerInvite"("email");
CREATE INDEX "OwnerInvite_ownerId_idx" ON "OwnerInvite"("ownerId");

CREATE TABLE "OwnerDelegation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "OwnerDelegation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OwnerDelegation_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OwnerDelegation_ownerId_managerId_key" ON "OwnerDelegation"("ownerId", "managerId");
CREATE INDEX "OwnerDelegation_managerId_idx" ON "OwnerDelegation"("managerId");

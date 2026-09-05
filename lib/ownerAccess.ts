import "server-only";
import { prisma } from "@/lib/prisma";
import { parseOwnerScopes, type OwnerDutyKey } from "@/lib/ownerDuties";

// The other accounts' ids `managerId` may act on for a given duty (e.g.
// "listings"), via an accepted OwnerDelegation -- used to widen an owner's
// own `where: { ownerId: user.id }` queries into `{ ownerId: { in: [...] } }`
// so a delegated team member sees a merged view of their own resources plus
// whatever they've been granted access to manage.
export async function getManagedOwnerIds(managerId: string, duty: OwnerDutyKey): Promise<string[]> {
  const rows = await prisma.ownerDelegation.findMany({
    where: { managerId },
    select: { ownerId: true, scopes: true },
  });
  return rows.filter((r) => parseOwnerScopes(r.scopes).includes(duty)).map((r) => r.ownerId);
}

// Whether `actorId` may act on `ownerId`'s resources for `duty` -- true for
// the owner themself, or a team member with that duty delegated to them.
// Used to widen the ownerId-or-admin checks in listings/ads/orders actions.
export async function canManageOwner(actorId: string, ownerId: string, duty: OwnerDutyKey): Promise<boolean> {
  if (actorId === ownerId) return true;
  const row = await prisma.ownerDelegation.findUnique({
    where: { ownerId_managerId: { ownerId, managerId: actorId } },
  });
  return !!row && parseOwnerScopes(row.scopes).includes(duty);
}

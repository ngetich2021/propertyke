import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AddPropertyToggle } from "@/components/listings/AddPropertyToggle";
import { MyListingsTable } from "./MyListingsTable";
import { getManagedOwnerIds } from "@/lib/ownerAccess";
import {
  cleanupExpiredSuspensions,
  cleanupExpiredListings,
  notifyExpiringListings,
  notifyReactivationNeeded,
  deactivateUnrenewedListings,
} from "@/lib/actions/maintenance";

export async function AddPropertySection() {
  const user = await requireUser();
  const [, managedOwnerIds] = await Promise.all([
    Promise.all([
      cleanupExpiredSuspensions(),
      cleanupExpiredListings(),
      notifyExpiringListings(),
      notifyReactivationNeeded(),
      deactivateUnrenewedListings(),
    ]),
    getManagedOwnerIds(user.id, "listings"),
  ]);
  // A team member (see OwnerDelegation) sees a merged view: their own
  // listings plus every owner's who granted them the "listings" duty --
  // each row's actual owner is shown via MyListingsTable's badge.
  const ownerIds = [user.id, ...managedOwnerIds];
  const [listings, managedOwners] = await Promise.all([
    prisma.listing.findMany({
      where: { ownerId: { in: ownerIds } },
      orderBy: { createdAt: "desc" },
      include: ownerIds.length > 1 ? { owner: { select: { id: true, name: true, businessName: true } } } : undefined,
    }),
    ownerIds.length > 1
      ? prisma.user.findMany({ where: { id: { in: managedOwnerIds } }, select: { id: true, name: true, businessName: true, phone: true } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My listings</h2>
        {!user.phone && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Add a phone number in Settings before posting.
          </p>
        )}
      </div>

      <AddPropertyToggle
        disabled={!user.phone}
        hasBusinessName={!!user.businessName}
        managedOwners={managedOwners}
      />

      <MyListingsTable listings={listings} currentUserId={user.id} />
    </div>
  );
}

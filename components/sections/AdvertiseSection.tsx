import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AdvertiseToggle } from "@/components/listings/AdvertiseToggle";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { MyAdsTable } from "./MyAdsTable";
import { getManagedOwnerIds } from "@/lib/ownerAccess";
import {
  cleanupExpiredSuspensions,
  cleanupExpiredListings,
  cleanupExpiredAds,
  notifyExpiringListings,
  notifyExpiringAds,
  notifyReactivationNeeded,
  deactivateUnrenewedListings,
} from "@/lib/actions/maintenance";

export async function AdvertiseSection() {
  const user = await requireUser();
  const [, managedOwnerIds] = await Promise.all([
    Promise.all([
      cleanupExpiredSuspensions(),
      cleanupExpiredListings(),
      cleanupExpiredAds(),
      notifyExpiringListings(),
      notifyExpiringAds(),
      notifyReactivationNeeded(),
      deactivateUnrenewedListings(),
    ]),
    getManagedOwnerIds(user.id, "ads"),
  ]);
  // A team member (see OwnerDelegation) with the "ads" duty sees a merged
  // view: their own listings/ads plus every owner's who granted them that
  // duty -- each ad row's actual owner is shown via MyAdsTable's badge.
  const ownerIds = [user.id, ...managedOwnerIds];

  const [listings, ads] = await Promise.all([
    prisma.listing.findMany({
      where: { ownerId: { in: ownerIds } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.ad.findMany({
      where: { ownerId: { in: ownerIds } },
      include: { listing: true, owner: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Promote a listing</h2>
          {!user.phone && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Add a phone number in Settings before posting.
            </p>
          )}
        </div>
        {listings.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Add a property first, then come back here to advertise it.
          </p>
        ) : (
          <AdvertiseToggle
            listings={listings}
            disabled={!user.phone}
            advertiser={{ businessName: user.businessName, phone: user.phone }}
          />
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your ads</h2>
          <DownloadExcelLink dataset="my-ads" />
        </div>
        <p className="mb-2 text-xs text-zinc-500">Click a row to edit, delete, or extend an ad.</p>
        <MyAdsTable ads={ads} currentUserId={user.id} />
      </section>
    </div>
  );
}

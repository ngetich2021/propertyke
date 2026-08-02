import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AdvertiseToggle } from "@/components/listings/AdvertiseToggle";
import { ClickableAdRow } from "@/components/listings/ClickableAdRow";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { formatMoney } from "@/lib/format";
import { parseAdMedia } from "@/lib/adMedia";
import { PaginatedTable, STICKY_COL_1, STICKY_COL_2 } from "@/components/ui/PaginatedTable";
import {
  cleanupExpiredSuspensions,
  cleanupExpiredListings,
  cleanupExpiredAds,
  notifyExpiringListings,
  notifyExpiringAds,
} from "@/lib/actions/maintenance";

export async function AdvertiseSection() {
  const user = await requireUser();
  await Promise.all([
    cleanupExpiredSuspensions(),
    cleanupExpiredListings(),
    cleanupExpiredAds(),
    notifyExpiringListings(),
    notifyExpiringAds(),
  ]);

  const [listings, ads] = await Promise.all([
    prisma.listing.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.ad.findMany({
      where: { ownerId: user.id },
      include: { listing: true },
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
        <PaginatedTable
          minWidth="700px"
          emptyMessage="No ads yet."
          head={
            <tr>
              <th className={`py-2 ${STICKY_COL_1}`}>#</th>
              <th className={`py-2 ${STICKY_COL_2}`}>Product</th>
              <th className="py-2">Listing</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Days</th>
              <th className="py-2">Media</th>
              <th className="py-2">Status</th>
              <th className="py-2">Message from admin</th>
            </tr>
          }
          rows={ads.map((ad, idx) => (
            <ClickableAdRow key={ad.id} ad={ad}>
              <td className={`py-2 ${STICKY_COL_1}`}>{idx + 1}</td>
              <td className={`py-2 ${STICKY_COL_2}`}>{ad.productName ?? "—"}</td>
              <td className="py-2">{ad.listing.title}</td>
              <td className="py-2">{formatMoney(ad.amount, ad.listing.currency)}</td>
              <td className="py-2">{ad.days}</td>
              <td className="py-2 text-zinc-500">{parseAdMedia(ad.media).length}</td>
              <td className="py-2">
                <StatusBadge status={ad.status} />
              </td>
              <td className="py-2 text-zinc-500">{ad.adminNote ?? "—"}</td>
            </ClickableAdRow>
          ))}
        />
      </section>
    </div>
  );
}

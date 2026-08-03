import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/format";
import { AdStatusForm } from "./AdStatusForm";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { PaginatedTable, STICKY_COL_1, STICKY_COL_2 } from "@/components/ui/PaginatedTable";
import { ClickableAdRow } from "@/components/listings/ClickableAdRow";
import { cleanupExpiredSuspensions, cleanupExpiredAds, notifyExpiringAds } from "@/lib/actions/maintenance";

export async function AdsPanel() {
  await Promise.all([cleanupExpiredSuspensions(), cleanupExpiredAds(), notifyExpiringAds()]);

  const ads = await prisma.ad.findMany({
    include: { listing: true, owner: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ads ({ads.length})</h2>
        <DownloadExcelLink dataset="ads" />
      </div>
      <p className="mb-2 text-xs text-zinc-500">
        Click a row for full details — description, contact, owner, targeting, media, and edit/delete/extend.
      </p>
      <PaginatedTable
        minWidth="700px"
        emptyMessage="No ads yet."
        head={
          <tr>
            <th className={`py-2 ${STICKY_COL_1}`}>#</th>
            <th className={`py-2 ${STICKY_COL_2}`}>Company</th>
            <th className="py-2">Product</th>
            <th className="py-2">Listing</th>
            <th className="py-2">Amount</th>
            <th className="py-2">Status</th>
            <th className="py-2">Actions</th>
          </tr>
        }
        rows={ads.map((ad, idx) => ({
          searchText: [ad.companyName, ad.productName, ad.listing.title, ad.owner.email, ad.status]
            .filter(Boolean)
            .join(" "),
          node: (
            <ClickableAdRow key={ad.id} ad={ad}>
              <td className={`py-2 ${STICKY_COL_1}`}>{idx + 1}</td>
              <td className={`py-2 ${STICKY_COL_2}`}>{ad.companyName ?? "—"}</td>
              <td className="max-w-35 truncate py-2">{ad.productName ?? "—"}</td>
              <td className="max-w-35 truncate py-2 text-zinc-500">{ad.listing.title}</td>
              <td className="py-2">{formatMoney(ad.amount, ad.listing.currency)}</td>
              <td className="py-2">
                <StatusBadge status={ad.status} />
              </td>
              <td className="py-2">
                {(ad.status === "PENDING" || ad.status === "ACTIVE") && (
                  <AdStatusForm adId={ad.id} status={ad.status} />
                )}
              </td>
            </ClickableAdRow>
          ),
        }))}
      />
    </div>
  );
}

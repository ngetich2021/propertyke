import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/format";
import { AdStatusForm } from "./AdStatusForm";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { parseAdMedia } from "@/lib/adMedia";
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
      <p className="mb-2 text-xs text-zinc-500">Click a row for full details, contact info, and edit/delete/extend.</p>
      <PaginatedTable
        minWidth="1300px"
        emptyMessage="No ads yet."
        head={
          <tr>
            <th className={`py-2 ${STICKY_COL_1}`}>#</th>
            <th className={`py-2 ${STICKY_COL_2}`}>Company</th>
            <th className="py-2">Product</th>
            <th className="py-2">Description</th>
            <th className="py-2">Contact</th>
            <th className="py-2">Listing</th>
            <th className="py-2">Owner</th>
            <th className="py-2">Amount</th>
            <th className="py-2">Days</th>
            <th className="py-2">Target</th>
            <th className="py-2">Repeat</th>
            <th className="py-2">Media</th>
            <th className="py-2">Status</th>
            <th className="py-2">Note</th>
            <th className="py-2">Actions</th>
          </tr>
        }
        rows={ads.map((ad, idx) => {
          const media = parseAdMedia(ad.media);
          return (
            <ClickableAdRow key={ad.id} ad={ad}>
              <td className={`py-2 ${STICKY_COL_1}`}>{idx + 1}</td>
              <td className={`py-2 ${STICKY_COL_2}`}>{ad.companyName ?? "—"}</td>
              <td className="py-2">{ad.productName ?? "—"}</td>
              <td className="max-w-xs truncate py-2 text-zinc-500" title={ad.productDescription ?? ""}>
                {ad.productDescription ?? "—"}
              </td>
              <td className="py-2 text-zinc-500">{ad.companyContact ?? "—"}</td>
              <td className="py-2">{ad.listing.title}</td>
              <td className="py-2 text-zinc-500">
                <div>{ad.owner.name ?? "—"}</div>
                <div>{ad.owner.email}</div>
                {ad.owner.phone && (
                  <a
                    href={`tel:${ad.owner.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="underline"
                  >
                    📞 {ad.owner.phone}
                  </a>
                )}
              </td>
              <td className="py-2">{formatMoney(ad.amount, ad.listing.currency)}</td>
              <td className="py-2">{ad.days}</td>
              <td className="py-2 text-zinc-500">
                {ad.targetMode === "EVERYWHERE" ? "Everywhere (2x)" : `${ad.targetRadiusKm}km radius`}
              </td>
              <td className="py-2 text-zinc-500">
                {ad.repeatEnabled ? `${ad.repeatCount}x/day` : "No"}
              </td>
              <td className="py-2 text-zinc-500" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col gap-0.5">
                  {media.length > 0
                    ? media.map((m, i) => (
                        <a
                          key={i}
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          {m.type}
                        </a>
                      ))
                    : "—"}
                </div>
              </td>
              <td className="py-2">
                <StatusBadge status={ad.status} />
              </td>
              <td className="py-2 text-zinc-500">{ad.adminNote ?? "—"}</td>
              <td className="py-2" onClick={(e) => e.stopPropagation()}>
                {(ad.status === "PENDING" || ad.status === "ACTIVE") && (
                  <AdStatusForm adId={ad.id} status={ad.status} />
                )}
              </td>
            </ClickableAdRow>
          );
        })}
      />
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { AdsTable } from "./AdsTable";
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
      <AdsTable ads={ads} />
    </div>
  );
}

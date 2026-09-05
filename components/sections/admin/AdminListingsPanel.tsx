import { prisma } from "@/lib/prisma";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { AdminListingsTable } from "./AdminListingsTable";
import {
  cleanupExpiredSuspensions,
  cleanupExpiredListings,
  notifyExpiringListings,
  notifyReactivationNeeded,
  deactivateUnrenewedListings,
} from "@/lib/actions/maintenance";
import type { ListingType } from "@/app/generated/prisma/client";

const TITLE: Record<ListingType, string> = {
  LAND: "Lands",
  PROPERTY: "Properties",
  RENTAL: "House to let",
};

const DATASET: Record<ListingType, string> = {
  LAND: "lands",
  PROPERTY: "properties",
  RENTAL: "housetolet",
};

export async function AdminListingsPanel({ type }: { type: ListingType }) {
  await Promise.all([
    cleanupExpiredSuspensions(),
    cleanupExpiredListings(),
    notifyExpiringListings(),
    notifyReactivationNeeded(),
    deactivateUnrenewedListings(),
  ]);

  const listings = await prisma.listing.findMany({
    where: { type },
    include: { owner: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {TITLE[type]} ({listings.length})
        </h2>
        <DownloadExcelLink dataset={DATASET[type]} />
      </div>
      <p className="mb-2 text-xs text-zinc-500">
        Click a row for full details — address, contact info, and edit/delete.
      </p>
      <AdminListingsTable listings={listings} />
    </div>
  );
}

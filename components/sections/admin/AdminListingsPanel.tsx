import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ListingStatusForm } from "./ListingStatusForm";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { PaginatedTable, STICKY_COL_1, STICKY_COL_2 } from "@/components/ui/PaginatedTable";
import { ClickableRow } from "@/components/ui/ClickableRow";
import {
  cleanupExpiredSuspensions,
  cleanupExpiredListings,
  notifyExpiringListings,
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
  await Promise.all([cleanupExpiredSuspensions(), cleanupExpiredListings(), notifyExpiringListings()]);

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
      <p className="mb-2 text-xs text-zinc-500">Click a row for full details, contact info, and edit/delete.</p>
      <PaginatedTable
        minWidth="900px"
        head={
          <tr>
            <th className={`py-2 ${STICKY_COL_1}`}>#</th>
            <th className={`py-2 ${STICKY_COL_2}`}>Title</th>
            <th className="py-2">Owner</th>
            <th className="py-2">Contact</th>
            <th className="py-2">Price</th>
            <th className="py-2">Address</th>
            <th className="py-2">Live until</th>
            <th className="py-2">Status</th>
            <th className="py-2">Actions</th>
          </tr>
        }
        rows={listings.map((listing, idx) => (
          <ClickableRow key={listing.id} listingId={listing.id}>
            <td className={`py-2 ${STICKY_COL_1}`}>{idx + 1}</td>
            <td className={`py-2 ${STICKY_COL_2}`}>{listing.title}</td>
            <td className="py-2 text-zinc-500">
              <div>{listing.owner.name ?? "—"}</div>
              <div>{listing.owner.email}</div>
            </td>
            <td className="py-2 text-zinc-500">
              {listing.owner.phone ? (
                <a
                  href={`tel:${listing.owner.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="underline"
                >
                  📞 {listing.owner.phone}
                </a>
              ) : (
                "—"
              )}
            </td>
            <td className="py-2">{formatMoney(listing.price, listing.currency)}</td>
            <td className="py-2 text-zinc-500">{listing.address ?? "—"}</td>
            <td className="py-2 text-zinc-500">
              {listing.status === "ACTIVE" && listing.endDate
                ? new Date(listing.endDate).toLocaleDateString()
                : "—"}
            </td>
            <td className="py-2">
              <StatusBadge status={listing.status} />
            </td>
            <td className="py-2" onClick={(e) => e.stopPropagation()}>
              <ListingStatusForm listingId={listing.id} currentStatus={listing.status} />
            </td>
          </ClickableRow>
        ))}
      />
    </div>
  );
}

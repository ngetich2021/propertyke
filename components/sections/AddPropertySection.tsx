import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AddPropertyToggle } from "@/components/listings/AddPropertyToggle";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PaginatedTable, STICKY_COL_1, STICKY_COL_2 } from "@/components/ui/PaginatedTable";
import { ClickableRow } from "@/components/ui/ClickableRow";
import { formatMoney } from "@/lib/format";
import {
  cleanupExpiredSuspensions,
  cleanupExpiredListings,
  notifyExpiringListings,
} from "@/lib/actions/maintenance";

export async function AddPropertySection() {
  const user = await requireUser();
  await Promise.all([cleanupExpiredSuspensions(), cleanupExpiredListings(), notifyExpiringListings()]);
  const listings = await prisma.listing.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });

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

      <AddPropertyToggle disabled={!user.phone} />

      <PaginatedTable
        minWidth="600px"
        emptyMessage="You haven't listed anything yet."
        head={
          <tr>
            <th className={`py-2 ${STICKY_COL_1}`}>#</th>
            <th className={`py-2 ${STICKY_COL_2}`}>Title</th>
            <th className="py-2">Type</th>
            <th className="py-2">Price</th>
            <th className="py-2">Live until</th>
            <th className="py-2">Status</th>
          </tr>
        }
        rows={listings.map((l, idx) => (
          <ClickableRow key={l.id} listingId={l.id}>
            <td className={`py-2 ${STICKY_COL_1}`}>{idx + 1}</td>
            <td className={`py-2 ${STICKY_COL_2}`}>{l.title}</td>
            <td className="py-2">{l.type}</td>
            <td className="py-2">{formatMoney(l.price, l.currency)}</td>
            <td className="py-2 text-zinc-500">
              {l.status === "ACTIVE" && l.endDate ? new Date(l.endDate).toLocaleDateString() : "—"}
            </td>
            <td className="py-2">
              <StatusBadge status={l.status} />
            </td>
          </ClickableRow>
        ))}
      />
    </div>
  );
}

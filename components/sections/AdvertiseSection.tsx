import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AdvertiseToggle } from "@/components/listings/AdvertiseToggle";
import { ClickableAdRow } from "@/components/listings/ClickableAdRow";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { formatMoney } from "@/lib/format";
import { parseAdMedia } from "@/lib/adMedia";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import {
  cleanupExpiredSuspensions,
  cleanupExpiredListings,
  cleanupExpiredAds,
  notifyExpiringListings,
  notifyExpiringAds,
  notifyReactivationNeeded,
  deactivateUnrenewedListings,
} from "@/lib/actions/maintenance";
import type { Ad, Listing } from "@/app/generated/prisma/client";

type AdRow = Ad & { listing: Listing };

const columns: DataTableColumnDef<AdRow>[] = [
  {
    id: "#",
    header: "#",
    enableSorting: false,
    meta: { headerClassName: STICKY_COL_1, cellClassName: STICKY_COL_1 },
    cell: ({ row }) => row.getDisplayIndex() + 1,
  },
  {
    accessorKey: "productName",
    header: ({ column }) => <SortableHeader label="Product" column={column} />,
    meta: { headerClassName: STICKY_COL_2, cellClassName: STICKY_COL_2 },
    cell: ({ row }) => row.original.productName ?? "—",
  },
  {
    id: "listing",
    accessorFn: (row) => row.listing.title,
    header: ({ column }) => <SortableHeader label="Listing" column={column} />,
    cell: ({ row }) => row.original.listing.title,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <SortableHeader label="Amount" column={column} />,
    cell: ({ row }) => formatMoney(row.original.amount, row.original.listing.currency),
  },
  {
    accessorKey: "days",
    header: ({ column }) => <SortableHeader label="Days" column={column} />,
    cell: ({ row }) => row.original.days,
  },
  {
    id: "media",
    accessorFn: (row) => parseAdMedia(row.media).length,
    header: ({ column }) => <SortableHeader label="Media" column={column} />,
    cell: ({ row }) => <span className="text-zinc-500">{parseAdMedia(row.original.media).length}</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader label="Status" column={column} />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "adminNote",
    header: "Message from admin",
    enableSorting: false,
    cell: ({ row }) => <span className="text-zinc-500">{row.original.adminNote ?? "—"}</span>,
  },
];

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
];

export async function AdvertiseSection() {
  const user = await requireUser();
  await Promise.all([
    cleanupExpiredSuspensions(),
    cleanupExpiredListings(),
    cleanupExpiredAds(),
    notifyExpiringListings(),
    notifyExpiringAds(),
    notifyReactivationNeeded(),
    deactivateUnrenewedListings(),
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
        <DataTable
          minWidth="700px"
          emptyMessage="No ads yet."
          columns={columns}
          data={ads}
          getRowSearchText={(ad) => [ad.productName, ad.listing.title, ad.status].filter(Boolean).join(" ")}
          statusFilter={{ columnId: "status", label: "status", options: STATUS_OPTIONS }}
          renderRow={(ad, cells) => (
            <ClickableAdRow key={ad.id} ad={ad}>
              {cells}
            </ClickableAdRow>
          )}
        />
      </section>
    </div>
  );
}

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AddPropertyToggle } from "@/components/listings/AddPropertyToggle";
import { ActivateListingButton } from "@/components/listings/ActivateListingButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { ClickableRow } from "@/components/ui/ClickableRow";
import { formatMoney } from "@/lib/format";
import {
  cleanupExpiredSuspensions,
  cleanupExpiredListings,
  notifyExpiringListings,
  notifyReactivationNeeded,
  deactivateUnrenewedListings,
} from "@/lib/actions/maintenance";
import { REACTIVATION_INTERVAL_MS } from "@/lib/listingActivation";
import type { Listing } from "@/app/generated/prisma/client";

const columns: DataTableColumnDef<Listing>[] = [
  {
    id: "#",
    header: "#",
    enableSorting: false,
    meta: { headerClassName: STICKY_COL_1, cellClassName: STICKY_COL_1 },
    cell: ({ row }) => row.getDisplayIndex() + 1,
  },
  {
    accessorKey: "title",
    header: ({ column }) => <SortableHeader label="Title" column={column} />,
    meta: { headerClassName: STICKY_COL_2, cellClassName: STICKY_COL_2 },
    cell: ({ row }) => row.original.title,
  },
  {
    accessorKey: "type",
    header: ({ column }) => <SortableHeader label="Type" column={column} />,
    cell: ({ row }) => row.original.type,
  },
  {
    accessorKey: "price",
    header: ({ column }) => <SortableHeader label="Price" column={column} />,
    cell: ({ row }) => formatMoney(row.original.price, row.original.currency),
  },
  {
    id: "reactivateBy",
    header: "Reactivate by",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-zinc-500">
        {row.original.status === "ACTIVE" && row.original.lastActivatedAt
          ? new Date(row.original.lastActivatedAt.getTime() + REACTIVATION_INTERVAL_MS).toLocaleDateString()
          : "—"}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader label="Status" column={column} />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <StatusBadge status={row.original.status} />
        {row.original.status === "INACTIVE" && <ActivateListingButton listingId={row.original.id} />}
      </div>
    ),
  },
];

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SOLD", label: "Sold" },
  { value: "RENTED", label: "Rented" },
  { value: "INACTIVE", label: "Inactive" },
];

export async function AddPropertySection() {
  const user = await requireUser();
  await Promise.all([
    cleanupExpiredSuspensions(),
    cleanupExpiredListings(),
    notifyExpiringListings(),
    notifyReactivationNeeded(),
    deactivateUnrenewedListings(),
  ]);
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

      <AddPropertyToggle disabled={!user.phone} hasBusinessName={!!user.businessName} />

      <DataTable
        minWidth="600px"
        emptyMessage="You haven't listed anything yet."
        columns={columns}
        data={listings}
        getRowSearchText={(l) => [l.title, l.type, l.status].filter(Boolean).join(" ")}
        statusFilter={{ columnId: "status", label: "status", options: STATUS_OPTIONS }}
        renderRow={(listing, cells) => (
          <ClickableRow key={listing.id} listingId={listing.id}>
            {cells}
          </ClickableRow>
        )}
      />
    </div>
  );
}

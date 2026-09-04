import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { ListingStatusForm } from "./ListingStatusForm";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import {
  DataTable,
  SortableHeader,
  STICKY_COL_1,
  STICKY_COL_2,
  type DataTableColumnDef,
} from "@/components/ui/data-table";
import { ClickableRow } from "@/components/ui/ClickableRow";
import {
  cleanupExpiredSuspensions,
  cleanupExpiredListings,
  notifyExpiringListings,
  notifyReactivationNeeded,
  deactivateUnrenewedListings,
} from "@/lib/actions/maintenance";
import type { Listing, ListingStatus, ListingType, User } from "@/app/generated/prisma/client";

type Row = Listing & { owner: User };

const STATUS_OPTIONS: { value: ListingStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SOLD", label: "Sold" },
  { value: "RENTED", label: "Rented" },
  { value: "INACTIVE", label: "Inactive" },
];

const columns: DataTableColumnDef<Row>[] = [
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
    id: "owner",
    accessorFn: (row) => row.owner.name ?? row.owner.email,
    header: ({ column }) => <SortableHeader label="Owner" column={column} />,
    cell: ({ row }) => (
      <span className="flex max-w-35 items-center gap-1 truncate text-zinc-500">
        {row.original.owner.name ?? row.original.owner.email}
        <VerifiedBadge verifiedUntil={row.original.owner.verifiedUntil} />
      </span>
    ),
  },
  {
    id: "contact",
    header: "Contact",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.owner.phone ? (
        <a href={`tel:${row.original.owner.phone}`} className="text-zinc-500 underline">
          📞 {row.original.owner.phone}
        </a>
      ) : (
        <span className="text-zinc-500">—</span>
      ),
  },
  {
    accessorKey: "price",
    header: ({ column }) => <SortableHeader label="Price" column={column} />,
    cell: ({ row }) => formatMoney(row.original.price, row.original.currency),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader label="Status" column={column} />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => <ListingStatusForm listingId={row.original.id} currentStatus={row.original.status} />,
  },
];

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
      <DataTable
        minWidth="700px"
        columns={columns}
        data={listings}
        getRowSearchText={(l) => [l.title, l.owner.name, l.owner.email, l.status].filter(Boolean).join(" ")}
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

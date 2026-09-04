import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/format";
import { AdStatusForm } from "./AdStatusForm";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { ClickableAdRow } from "@/components/listings/ClickableAdRow";
import { cleanupExpiredSuspensions, cleanupExpiredAds, notifyExpiringAds } from "@/lib/actions/maintenance";
import type { Ad, Listing, User } from "@/app/generated/prisma/client";

type AdRow = Ad & { listing: Listing; owner: User };

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
];

const columns: DataTableColumnDef<AdRow>[] = [
  {
    id: "#",
    header: "#",
    enableSorting: false,
    meta: { headerClassName: STICKY_COL_1, cellClassName: STICKY_COL_1 },
    cell: ({ row }) => row.getDisplayIndex() + 1,
  },
  {
    accessorKey: "companyName",
    header: ({ column }) => <SortableHeader label="Company" column={column} />,
    meta: { headerClassName: STICKY_COL_2, cellClassName: STICKY_COL_2 },
    cell: ({ row }) => row.original.companyName ?? "—",
  },
  {
    accessorKey: "productName",
    header: ({ column }) => <SortableHeader label="Product" column={column} />,
    cell: ({ row }) => <span className="block max-w-35 truncate">{row.original.productName ?? "—"}</span>,
  },
  {
    id: "listing",
    accessorFn: (row) => row.listing.title,
    header: ({ column }) => <SortableHeader label="Listing" column={column} />,
    cell: ({ row }) => <span className="block max-w-35 truncate text-zinc-500">{row.original.listing.title}</span>,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <SortableHeader label="Amount" column={column} />,
    cell: ({ row }) => formatMoney(row.original.amount, row.original.listing.currency),
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
    cell: ({ row }) =>
      (row.original.status === "PENDING" || row.original.status === "ACTIVE") && (
        <AdStatusForm adId={row.original.id} status={row.original.status} />
      ),
  },
];

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
      <DataTable
        minWidth="700px"
        emptyMessage="No ads yet."
        columns={columns}
        data={ads}
        getRowSearchText={(ad) =>
          [ad.companyName, ad.productName, ad.listing.title, ad.owner.email, ad.status].filter(Boolean).join(" ")
        }
        statusFilter={{ columnId: "status", label: "status", options: STATUS_OPTIONS }}
        renderRow={(ad, cells) => (
          <ClickableAdRow key={ad.id} ad={ad}>
            {cells}
          </ClickableAdRow>
        )}
      />
    </div>
  );
}

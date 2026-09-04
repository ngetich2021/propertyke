import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { ClickableOrderRow } from "@/components/listings/ClickableOrderRow";
import type { Listing, Order, User } from "@/app/generated/prisma/client";

type OwnerOrderRow = Order & { listing: Listing; buyer: User };
type BuyerOrderRow = Order & { listing: Listing };

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
];

const ownerColumns: DataTableColumnDef<OwnerOrderRow>[] = [
  {
    id: "#",
    header: "#",
    enableSorting: false,
    meta: { headerClassName: STICKY_COL_1, cellClassName: STICKY_COL_1 },
    cell: ({ row }) => row.getDisplayIndex() + 1,
  },
  {
    id: "listing",
    accessorFn: (row) => row.listing.title,
    header: ({ column }) => <SortableHeader label="Listing" column={column} />,
    meta: { headerClassName: STICKY_COL_2, cellClassName: STICKY_COL_2 },
    cell: ({ row }) => (
      <>
        {row.original.listing.title}
        {row.original.message && (
          <p className="text-xs italic text-zinc-500">&ldquo;{row.original.message}&rdquo;</p>
        )}
      </>
    ),
  },
  {
    id: "buyer",
    accessorFn: (row) => row.buyer.name ?? row.buyer.email,
    header: ({ column }) => <SortableHeader label="Buyer" column={column} />,
    cell: ({ row }) => (
      <span className="text-zinc-500">{row.original.buyer.name ?? row.original.buyer.email}</span>
    ),
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
];

const buyerColumns: DataTableColumnDef<BuyerOrderRow>[] = [
  {
    id: "#",
    header: "#",
    enableSorting: false,
    meta: { headerClassName: STICKY_COL_1, cellClassName: STICKY_COL_1 },
    cell: ({ row }) => row.getDisplayIndex() + 1,
  },
  {
    id: "listing",
    accessorFn: (row) => row.listing.title,
    header: ({ column }) => <SortableHeader label="Listing" column={column} />,
    meta: { headerClassName: STICKY_COL_2, cellClassName: STICKY_COL_2 },
    cell: ({ row }) => row.original.listing.title,
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
];

export async function OrdersSection() {
  const user = await requireUser();

  const [asBuyer, asOwner] = await Promise.all([
    prisma.order.findMany({
      where: { buyerId: user.id },
      include: { listing: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: { listing: { ownerId: user.id } },
      include: { listing: true, buyer: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Orders</h2>
        <DownloadExcelLink dataset="my-orders" />
      </div>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-zinc-500">Orders received on your listings</h3>
        <p className="mb-2 text-xs text-zinc-500">Click a row for buyer contact details and to update its status.</p>
        <DataTable
          minWidth="600px"
          emptyMessage="No one has expressed interest yet."
          columns={ownerColumns}
          data={asOwner}
          getRowSearchText={(order) =>
            [order.listing.title, order.buyer.name, order.buyer.email, order.status].filter(Boolean).join(" ")
          }
          statusFilter={{ columnId: "status", label: "status", options: STATUS_OPTIONS }}
          renderRow={(order, cells) => (
            <ClickableOrderRow key={order.id} order={order} role="owner">
              {cells}
            </ClickableOrderRow>
          )}
        />
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-zinc-500">Your inquiries</h3>
        <p className="mb-2 text-xs text-zinc-500">Click a row for full details.</p>
        <DataTable
          minWidth="400px"
          emptyMessage="You haven't expressed interest in anything yet."
          columns={buyerColumns}
          data={asBuyer}
          getRowSearchText={(order) => [order.listing.title, order.status].filter(Boolean).join(" ")}
          statusFilter={{ columnId: "status", label: "status", options: STATUS_OPTIONS }}
          renderRow={(order, cells) => (
            <ClickableOrderRow key={order.id} order={order} role="buyer">
              {cells}
            </ClickableOrderRow>
          )}
        />
      </section>
    </div>
  );
}

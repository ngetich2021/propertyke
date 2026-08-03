import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { PaginatedTable, STICKY_COL_1, STICKY_COL_2 } from "@/components/ui/PaginatedTable";
import { ClickableOrderRow } from "@/components/listings/ClickableOrderRow";

export async function AdminOrdersPanel() {
  const orders = await prisma.order.findMany({
    include: { listing: { include: { owner: true } }, buyer: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Orders ({orders.length})</h2>
        <DownloadExcelLink dataset="orders" />
      </div>
      <p className="mb-2 text-xs text-zinc-500">
        Click a row for buyer + seller contact details and to update its status.
      </p>
      <PaginatedTable
        minWidth="700px"
        emptyMessage="No orders yet."
        head={
          <tr>
            <th className={`py-2 ${STICKY_COL_1}`}>#</th>
            <th className={`py-2 ${STICKY_COL_2}`}>Listing</th>
            <th className="py-2">Buyer</th>
            <th className="py-2">Seller</th>
            <th className="py-2">Amount</th>
            <th className="py-2">Status</th>
          </tr>
        }
        rows={orders.map((order, idx) => ({
          searchText: [
            order.listing.title,
            order.buyer.name,
            order.buyer.email,
            order.listing.owner.businessName,
            order.listing.owner.name,
            order.listing.owner.email,
            order.contactPhone,
            order.status,
          ]
            .filter(Boolean)
            .join(" "),
          node: (
            <ClickableOrderRow key={order.id} order={order} role="admin">
              <td className={`py-2 ${STICKY_COL_1}`}>{idx + 1}</td>
              <td className={`py-2 ${STICKY_COL_2}`}>{order.listing.title}</td>
              <td className="max-w-35 truncate py-2 text-zinc-500">
                {order.buyer.name ?? order.buyer.email}
              </td>
              <td className="max-w-35 truncate py-2 text-zinc-500">
                {order.listing.owner.businessName ?? order.listing.owner.name ?? order.listing.owner.email}
              </td>
              <td className="py-2">{formatMoney(order.amount, order.listing.currency)}</td>
              <td className="py-2">
                <StatusBadge status={order.status} />
              </td>
            </ClickableOrderRow>
          ),
        }))}
      />
    </div>
  );
}

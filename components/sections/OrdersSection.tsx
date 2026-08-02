import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { updateOrderStatus } from "@/lib/actions/orders";
import { formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { PaginatedTable, STICKY_COL_1, STICKY_COL_2 } from "@/components/ui/PaginatedTable";

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
        <PaginatedTable
          minWidth="700px"
          emptyMessage="No one has expressed interest yet."
          head={
            <tr>
              <th className={`py-2 ${STICKY_COL_1}`}>#</th>
              <th className={`py-2 ${STICKY_COL_2}`}>Listing</th>
              <th className="py-2">Buyer</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          }
          rows={asOwner.map((order, idx) => (
            <tr key={order.id} className="border-t border-zinc-100 dark:border-zinc-900">
              <td className={`py-2 ${STICKY_COL_1}`}>{idx + 1}</td>
              <td className={`py-2 ${STICKY_COL_2}`}>
                {order.listing.title}
                {order.message && (
                  <p className="text-xs italic text-zinc-500">&ldquo;{order.message}&rdquo;</p>
                )}
              </td>
              <td className="py-2 text-zinc-500">
                {order.buyer.name ?? order.buyer.email}
              </td>
              <td className="py-2">{formatMoney(order.amount, order.listing.currency)}</td>
              <td className="py-2">
                <StatusBadge status={order.status} />
              </td>
              <td className="py-2">
                {order.status === "PENDING" && (
                  <div className="flex gap-2">
                    <form action={updateOrderStatus}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="status" value="PAID" />
                      <SubmitButton className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700">
                        Mark paid
                      </SubmitButton>
                    </form>
                    <form action={updateOrderStatus}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="status" value="CANCELLED" />
                      <SubmitButton className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700">
                        Cancel
                      </SubmitButton>
                    </form>
                  </div>
                )}
              </td>
            </tr>
          ))}
        />
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-zinc-500">Your inquiries</h3>
        <PaginatedTable
          minWidth="400px"
          emptyMessage="You haven't expressed interest in anything yet."
          head={
            <tr>
              <th className={`py-2 ${STICKY_COL_1}`}>#</th>
              <th className={`py-2 ${STICKY_COL_2}`}>Listing</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Status</th>
            </tr>
          }
          rows={asBuyer.map((order, idx) => (
            <tr key={order.id} className="border-t border-zinc-100 dark:border-zinc-900">
              <td className={`py-2 ${STICKY_COL_1}`}>{idx + 1}</td>
              <td className={`py-2 ${STICKY_COL_2}`}>{order.listing.title}</td>
              <td className="py-2">{formatMoney(order.amount, order.listing.currency)}</td>
              <td className="py-2">
                <StatusBadge status={order.status} />
              </td>
            </tr>
          ))}
        />
      </section>
    </div>
  );
}

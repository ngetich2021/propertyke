import { prisma } from "@/lib/prisma";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { AdminOrdersTable } from "./AdminOrdersTable";

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
      <AdminOrdersTable orders={orders} />
    </div>
  );
}

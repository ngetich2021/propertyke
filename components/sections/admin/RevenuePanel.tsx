import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";

export async function RevenuePanel() {
  const [paidOrders, activeAds, pendingOrders, pendingAds] = await Promise.all([
    prisma.order.aggregate({ where: { status: "PAID" }, _sum: { amount: true }, _count: true }),
    prisma.ad.aggregate({ where: { status: "ACTIVE" }, _sum: { amount: true }, _count: true }),
    prisma.order.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: true }),
    prisma.ad.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: true }),
  ]);

  const orderRevenue = paidOrders._sum.amount ?? 0;
  const adRevenue = activeAds._sum.amount ?? 0;

  const cards = [
    { label: "Orders revenue (paid)", value: formatMoney(orderRevenue), sub: `${paidOrders._count} orders` },
    { label: "Ads revenue (active)", value: formatMoney(adRevenue), sub: `${activeAds._count} ads` },
    { label: "Total revenue", value: formatMoney(orderRevenue + adRevenue), sub: "orders + ads" },
    { label: "Pending orders", value: String(pendingOrders._count), sub: formatMoney(pendingOrders._sum.amount ?? 0) },
    { label: "Pending ads", value: String(pendingAds._count), sub: formatMoney(pendingAds._sum.amount ?? 0) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Revenue</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">{c.label}</p>
            <p className="text-xl font-bold">{c.value}</p>
            <p className="text-xs text-zinc-400">{c.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

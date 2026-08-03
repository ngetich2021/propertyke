import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { PaginatedTable, STICKY_COL_1, STICKY_COL_2 } from "@/components/ui/PaginatedTable";
import type { PaymentPurpose } from "@/app/generated/prisma/client";

// Orders are just a buyer expressing interest to a seller -- the company
// never touches that money, so they're excluded from revenue entirely. The
// only money the company actually receives is the M-Pesa charge for
// creating/extending a listing or ad (see lib/paymentApply.ts), tracked as
// Payment rows.
const SOURCE_LABEL: Record<PaymentPurpose, string> = {
  LISTING_CREATE: "Listing",
  LISTING_EXTEND: "Listing addition",
  AD_CREATE: "Ads",
  AD_EXTEND: "Ads addition",
};

const LISTING_PURPOSES: PaymentPurpose[] = ["LISTING_CREATE", "LISTING_EXTEND"];
const AD_PURPOSES: PaymentPurpose[] = ["AD_CREATE", "AD_EXTEND"];

export async function RevenuePanel() {
  const [listingRevenue, adRevenue, pendingPayments, paidPayments] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: "SUCCESS", purpose: { in: LISTING_PURPOSES } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { status: "SUCCESS", purpose: { in: AD_PURPOSES } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.findMany({
      where: { status: "SUCCESS" },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const listingTotal = listingRevenue._sum.amount ?? 0;
  const adTotal = adRevenue._sum.amount ?? 0;

  const cards = [
    { label: "Listing revenue", value: formatMoney(listingTotal), sub: `${listingRevenue._count} payments` },
    { label: "Ads revenue", value: formatMoney(adTotal), sub: `${adRevenue._count} payments` },
    { label: "Total revenue", value: formatMoney(listingTotal + adTotal), sub: "listings + ads, via M-Pesa" },
    {
      label: "Pending payments",
      value: String(pendingPayments._count),
      sub: formatMoney(pendingPayments._sum.amount ?? 0),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Revenue</h2>
      <p className="text-xs text-zinc-500">
        Orders aren&rsquo;t counted here -- that money passes between users, not to the company. Revenue is what
        was actually collected via M-Pesa for listing and ad payments.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">{c.label}</p>
            <p className="text-xl font-bold">{c.value}</p>
            <p className="text-xs text-zinc-400">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="mb-1 mt-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Who paid</h3>
        <DownloadExcelLink dataset="payments" />
      </div>
      <PaginatedTable
        minWidth="700px"
        emptyMessage="No payments yet."
        head={
          <tr>
            <th className={`py-2 ${STICKY_COL_1}`}>#</th>
            <th className={`py-2 ${STICKY_COL_2}`}>Name</th>
            <th className="py-2">Time</th>
            <th className="py-2">Tel</th>
            <th className="py-2">M-Pesa code</th>
            <th className="py-2">Source</th>
            <th className="py-2">Amount</th>
          </tr>
        }
        rows={paidPayments.map((p, idx) => ({
          searchText: [p.user.name, p.user.email, p.phone, p.mpesaReceipt, SOURCE_LABEL[p.purpose]]
            .filter(Boolean)
            .join(" "),
          node: (
            <tr key={p.id} className="border-t border-zinc-100 dark:border-zinc-800">
              <td className={`py-2 ${STICKY_COL_1}`}>{idx + 1}</td>
              <td className={`py-2 ${STICKY_COL_2}`}>{p.user.name ?? p.user.email}</td>
              <td className="py-2 text-zinc-500">{p.createdAt.toLocaleString()}</td>
              <td className="py-2 text-zinc-500">{p.phone}</td>
              <td className="py-2 text-zinc-500">{p.mpesaReceipt ?? "—"}</td>
              <td className="py-2">{SOURCE_LABEL[p.purpose]}</td>
              <td className="py-2">{formatMoney(p.amount)}</td>
            </tr>
          ),
        }))}
      />
    </div>
  );
}

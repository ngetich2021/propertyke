import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import type { Payment, PaymentPurpose, User } from "@/app/generated/prisma/client";

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
  VERIFICATION: "Verification",
};

const LISTING_PURPOSES: PaymentPurpose[] = ["LISTING_CREATE", "LISTING_EXTEND"];
const AD_PURPOSES: PaymentPurpose[] = ["AD_CREATE", "AD_EXTEND"];

type PaymentRow = Payment & { user: User };

const columns: DataTableColumnDef<PaymentRow>[] = [
  {
    id: "#",
    header: "#",
    enableSorting: false,
    meta: { headerClassName: STICKY_COL_1, cellClassName: STICKY_COL_1 },
    cell: ({ row }) => row.getDisplayIndex() + 1,
  },
  {
    id: "name",
    accessorFn: (row) => row.user.name ?? row.user.email,
    header: ({ column }) => <SortableHeader label="Name" column={column} />,
    meta: { headerClassName: STICKY_COL_2, cellClassName: STICKY_COL_2 },
    cell: ({ row }) => row.original.user.name ?? row.original.user.email,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <SortableHeader label="Time" column={column} />,
    cell: ({ row }) => <span className="text-zinc-500">{row.original.createdAt.toLocaleString()}</span>,
  },
  {
    accessorKey: "phone",
    header: "Tel",
    enableSorting: false,
    cell: ({ row }) => <span className="text-zinc-500">{row.original.phone}</span>,
  },
  {
    accessorKey: "mpesaReceipt",
    header: "M-Pesa code",
    enableSorting: false,
    cell: ({ row }) => <span className="text-zinc-500">{row.original.mpesaReceipt ?? "—"}</span>,
  },
  {
    id: "source",
    accessorFn: (row) => SOURCE_LABEL[row.purpose],
    header: ({ column }) => <SortableHeader label="Source" column={column} />,
    cell: ({ row }) => SOURCE_LABEL[row.original.purpose],
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <SortableHeader label="Amount" column={column} />,
    cell: ({ row }) => formatMoney(row.original.amount),
  },
];

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
      <DataTable
        minWidth="700px"
        emptyMessage="No payments yet."
        columns={columns}
        data={paidPayments}
        getRowSearchText={(p) =>
          [p.user.name, p.user.email, p.phone, p.mpesaReceipt, SOURCE_LABEL[p.purpose]].filter(Boolean).join(" ")
        }
      />
    </div>
  );
}

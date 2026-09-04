const COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  DISMISSED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  SOLD: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  RENTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  UNDER_REVIEW: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  EXPIRED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  INACTIVE: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        COLORS[status] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      {status}
    </span>
  );
}

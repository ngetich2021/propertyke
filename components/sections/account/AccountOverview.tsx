import { StatusBadge } from "@/components/ui/StatusBadge";

export function AccountOverview({
  user,
}: {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    phone?: string | null;
    businessName?: string | null;
    role: string;
  };
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt={user.name ?? "avatar"} className="h-14 w-14 rounded-full" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        )}
        <div>
          <p className="font-medium">{user.name ?? "No name set"}</p>
          {user.businessName && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.businessName}</p>
          )}
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
          {user.phone && <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.phone}</p>}
          <StatusBadge status={user.role} />
        </div>
      </div>
      <p className="text-sm text-zinc-500">
        Manage your listings from <span className="font-medium">orders</span>,{" "}
        <span className="font-medium">advertise</span>, and{" "}
        <span className="font-medium">add property</span>. Update your details in{" "}
        <span className="font-medium">settings</span>.
      </p>
    </div>
  );
}

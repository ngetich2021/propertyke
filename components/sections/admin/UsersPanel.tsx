import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { ClickableUserRow } from "@/components/sections/admin/ClickableUserRow";
import { UsersOfficialsTabs } from "./UsersOfficialsTabs";
import type { User } from "@/app/generated/prisma/client";

const columns: DataTableColumnDef<User>[] = [
  {
    id: "#",
    header: "#",
    enableSorting: false,
    meta: { headerClassName: STICKY_COL_1, cellClassName: STICKY_COL_1 },
    cell: ({ row }) => row.getDisplayIndex() + 1,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader label="Name" column={column} />,
    meta: { headerClassName: STICKY_COL_2, cellClassName: STICKY_COL_2 },
    cell: ({ row }) => (
      <span className="flex items-center gap-1">
        {row.original.name ?? "—"}
        <VerifiedBadge verifiedUntil={row.original.verifiedUntil} />
      </span>
    ),
  },
  {
    accessorKey: "email",
    header: ({ column }) => <SortableHeader label="Email" column={column} />,
    cell: ({ row }) => row.original.email,
  },
  {
    id: "phone",
    header: "Phone",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.phone ? (
        <a href={`tel:${row.original.phone}`} className="text-zinc-500 underline">
          📞 {row.original.phone}
        </a>
      ) : (
        <span className="text-zinc-500">—</span>
      ),
  },
  {
    accessorKey: "role",
    header: ({ column }) => <SortableHeader label="Role" column={column} />,
    cell: ({ row }) => <StatusBadge status={row.original.role} />,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <SortableHeader label="Joined" column={column} />,
    cell: ({ row }) => <span className="text-zinc-500">{row.original.createdAt.toLocaleDateString()}</span>,
  },
];

export async function UsersPanel() {
  const allUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const users = allUsers.filter((u) => u.role === "USER");
  const officials = allUsers.filter((u) => u.role !== "USER");

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Users ({allUsers.length})</h2>
        <DownloadExcelLink dataset="users" />
      </div>
      <p className="mb-2 text-xs text-zinc-500">Click a row for full user details.</p>
      <UsersOfficialsTabs
        columns={columns}
        userData={users}
        officialData={officials}
        getRowSearchText={(u) => [u.name, u.email, u.phone, u.role].filter(Boolean).join(" ")}
        renderRow={(user, cells) => (
          <ClickableUserRow key={user.id} user={user}>
            {cells}
          </ClickableUserRow>
        )}
      />
    </div>
  );
}

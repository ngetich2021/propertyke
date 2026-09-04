import { prisma } from "@/lib/prisma";
import { RoleForm } from "./RoleForm";
import { PermissionsForm } from "./PermissionsForm";
import { parsePermissions } from "@/lib/permissions";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { ClickableUserRow } from "@/components/sections/admin/ClickableUserRow";
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
    enableSorting: true,
    cell: ({ row }) => <RoleForm userId={row.original.id} currentRole={row.original.role} />,
  },
  {
    id: "permissions",
    header: "Delegated duties",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.role === "ADMIN" ? (
        <span className="text-xs text-zinc-500">all (admin)</span>
      ) : (
        <PermissionsForm
          userId={row.original.id}
          currentPermissions={parsePermissions(row.original.permissions)}
        />
      ),
  },
];

export async function RolesPanel() {
  const [users, adminCount, userCount] = await Promise.all([
    prisma.user.findMany({ orderBy: { email: "asc" }, take: 100 }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { role: "USER" } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Roles</h2>
        <DownloadExcelLink dataset="users" />
      </div>
      <div className="flex gap-4 text-sm">
        <p><span className="font-bold">{adminCount}</span> admins</p>
        <p><span className="font-bold">{userCount}</span> users</p>
      </div>
      <p className="text-xs text-zinc-500">Click a row for full user details.</p>
      <DataTable
        minWidth="800px"
        columns={columns}
        data={users}
        getRowSearchText={(u) => [u.name, u.email, u.phone, u.role].filter(Boolean).join(" ")}
        statusFilter={{
          columnId: "role",
          label: "role",
          options: [
            { value: "USER", label: "User" },
            { value: "ADMIN", label: "Admin" },
          ],
        }}
        renderRow={(user, cells) => (
          <ClickableUserRow key={user.id} user={user}>
            {cells}
          </ClickableUserRow>
        )}
      />
    </div>
  );
}

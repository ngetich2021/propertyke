"use client";

import { useMemo } from "react";
import { RoleActionsMenu } from "./RoleActionsMenu";
import { parsePermissions } from "@/lib/permissions";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { RevealPhoneButton } from "@/components/ui/RevealPhoneButton";
import { Badge } from "@/components/ui/badge";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { ClickableUserRow } from "@/components/sections/admin/ClickableUserRow";
import type { User } from "@/app/generated/prisma/client";

type UserWithRole = User & { customRole: { id: string; name: string } | null };

// Column defs (with JSX-returning cell/header functions) live here, inside
// the client boundary, rather than in the Server Component that fetches the
// data -- React can't serialize a raw function as a prop crossing from a
// Server Component into a Client Component like DataTable, so RolesPanel
// passes only plain `users` data in and this file owns rendering entirely.
function buildColumns(roles: { id: string; name: string }[]): DataTableColumnDef<UserWithRole>[] {
  return [
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
        <RevealPhoneButton phone={row.original.phone} className="text-zinc-500 underline" />
      ) : (
        <span className="text-zinc-500">—</span>
      ),
  },
  {
    accessorKey: "role",
    header: ({ column }) => <SortableHeader label="Role" column={column} />,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5">
        <Badge variant={row.original.role === "ADMIN" ? "default" : "secondary"}>{row.original.role}</Badge>
        {row.original.customRole && <Badge variant="outline">{row.original.customRole.name}</Badge>}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    meta: { cellClassName: "text-right" },
    cell: ({ row }) => (
      <div className="flex justify-end">
        <RoleActionsMenu
          userId={row.original.id}
          currentRole={row.original.role}
          currentPermissions={parsePermissions(row.original.permissions)}
          currentRoleId={row.original.customRole?.id ?? null}
          roles={roles}
        />
      </div>
    ),
  },
  ];
}

export function RolesTable({ users, roles }: { users: UserWithRole[]; roles: { id: string; name: string }[] }) {
  const columns = useMemo(() => buildColumns(roles), [roles]);
  return (
    <DataTable
      minWidth="600px"
      columns={columns}
      data={users}
      getRowSearchText={(u) => [u.name, u.email, u.phone, u.role, u.customRole?.name].filter(Boolean).join(" ")}
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
  );
}

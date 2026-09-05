"use client";

import { useMemo, useState, type ReactNode } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { RevealPhoneButton } from "@/components/ui/RevealPhoneButton";
import { DataTable, STICKY_COL_1, STICKY_COL_2, SortableHeader, type DataTableColumnDef } from "@/components/ui/data-table";
import { ClickableUserRow } from "@/components/sections/admin/ClickableUserRow";
import { UserActionsMenu } from "@/components/sections/admin/UserActionsMenu";
import { parsePermissions } from "@/lib/permissions";
import type { User } from "@/app/generated/prisma/client";

type UserWithRole = User & { customRole: { id: string; name: string } | null };

// Column defs (with JSX-returning cell/header functions) live here, inside
// the client boundary, rather than in UsersPanel (a Server Component) --
// React can't serialize a raw function as a prop crossing a Server->Client
// boundary, so UsersPanel passes only plain user arrays in and this file
// owns rendering entirely.
function buildColumns(roles: { id: string; name: string }[], isAdmin: boolean): DataTableColumnDef<UserWithRole>[] {
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
    cell: ({ row }) => <StatusBadge status={row.original.role} />,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <SortableHeader label="Joined" column={column} />,
    cell: ({ row }) => <span className="text-zinc-500">{row.original.createdAt.toLocaleDateString()}</span>,
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    meta: { cellClassName: "text-right" },
    cell: ({ row }) => (
      <div className="flex justify-end">
        <UserActionsMenu
          userId={row.original.id}
          currentName={row.original.name}
          currentPhone={row.original.phone}
          currentBusinessName={row.original.businessName}
          currentRole={row.original.role}
          currentPermissions={parsePermissions(row.original.permissions)}
          currentRoleId={row.original.customRole?.id ?? null}
          roles={roles}
          showAccessEditor={isAdmin}
        />
      </div>
    ),
  },
  ];
}

function getRowSearchText(u: UserWithRole) {
  return [u.name, u.email, u.phone, u.role, u.customRole?.name].filter(Boolean).join(" ");
}

function renderRow(user: UserWithRole, cells: ReactNode) {
  return (
    <ClickableUserRow key={user.id} user={user}>
      {cells}
    </ClickableUserRow>
  );
}

export function UsersOfficialsTabs({
  userData,
  officialData,
  roles,
  isAdmin,
}: {
  userData: UserWithRole[];
  officialData: UserWithRole[];
  roles: { id: string; name: string }[];
  isAdmin: boolean;
}) {
  const [tab, setTab] = useState<"users" | "officials">("users");
  const columns = useMemo(() => buildColumns(roles, isAdmin), [roles, isAdmin]);

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" className="flex gap-4 border-b border-zinc-200 pb-2 text-sm dark:border-zinc-800">
        <button
          role="tab"
          aria-selected={tab === "users"}
          onClick={() => setTab("users")}
          className={
            tab === "users" ? "font-medium underline underline-offset-4" : "text-zinc-500 dark:text-zinc-400"
          }
        >
          Users ({userData.length})
        </button>
        <button
          role="tab"
          aria-selected={tab === "officials"}
          onClick={() => setTab("officials")}
          className={
            tab === "officials" ? "font-medium underline underline-offset-4" : "text-zinc-500 dark:text-zinc-400"
          }
        >
          Officials ({officialData.length})
        </button>
      </div>
      <DataTable
        minWidth="500px"
        columns={columns}
        data={tab === "users" ? userData : officialData}
        getRowSearchText={getRowSearchText}
        renderRow={renderRow}
        emptyMessage={tab === "users" ? "No users yet." : "No officials yet."}
      />
    </div>
  );
}

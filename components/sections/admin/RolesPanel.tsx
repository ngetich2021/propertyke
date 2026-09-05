import { prisma } from "@/lib/prisma";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { RolesTable } from "./RolesTable";
import { CustomRolesManager } from "./CustomRolesManager";
import { StaffInvitesManager } from "./StaffInvitesManager";
import { parsePermissions } from "@/lib/permissions";

export async function RolesPanel() {
  const [users, adminCount, userCount, roles, invites] = await Promise.all([
    prisma.user.findMany({
      orderBy: { email: "asc" },
      take: 100,
      include: { customRole: { select: { id: true, name: true } } },
    }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { role: "USER" } }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
    }),
    prisma.staffInvite.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { customRole: { select: { name: true } } },
    }),
  ]);

  const rolesWithCounts = roles.map((r) => ({
    id: r.id,
    name: r.name,
    permissions: parsePermissions(r.permissions),
    userCount: r._count.users,
  }));

  const inviteRows = invites.map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    status: i.status,
    customRoleName: i.customRole?.name ?? null,
    createdAt: i.createdAt,
  }));

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
      <div className="flex gap-2">
        <StaffInvitesManager invites={inviteRows} roles={rolesWithCounts.map(({ id, name }) => ({ id, name }))} />
        <CustomRolesManager roles={rolesWithCounts} />
      </div>
      <p className="text-xs text-zinc-500">Click a row for full user details.</p>
      <RolesTable users={users} roles={rolesWithCounts.map(({ id, name }) => ({ id, name }))} />
    </div>
  );
}

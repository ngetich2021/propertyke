import { prisma } from "@/lib/prisma";
import { RoleForm } from "./RoleForm";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { PaginatedTable, STICKY_COL_1, STICKY_COL_2 } from "@/components/ui/PaginatedTable";
import { ClickableUserRow } from "@/components/sections/admin/ClickableUserRow";

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
      <PaginatedTable
        minWidth="500px"
        head={
          <tr>
            <th className={`py-2 ${STICKY_COL_1}`}>#</th>
            <th className={`py-2 ${STICKY_COL_2}`}>Name</th>
            <th className="py-2">Email</th>
            <th className="py-2">Phone</th>
            <th className="py-2">Role</th>
          </tr>
        }
        rows={users.map((u, idx) => ({
          searchText: [u.name, u.email, u.phone, u.role].filter(Boolean).join(" "),
          node: (
            <ClickableUserRow key={u.id} user={u}>
              <td className={`py-2 ${STICKY_COL_1}`}>{idx + 1}</td>
              <td className={`py-2 ${STICKY_COL_2}`}>{u.name ?? "—"}</td>
              <td className="py-2">{u.email}</td>
              <td className="py-2 text-zinc-500">
                {u.phone ? (
                  <a href={`tel:${u.phone}`} className="underline">
                    📞 {u.phone}
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-2">
                <RoleForm userId={u.id} currentRole={u.role} />
              </td>
            </ClickableUserRow>
          ),
        }))}
      />
    </div>
  );
}

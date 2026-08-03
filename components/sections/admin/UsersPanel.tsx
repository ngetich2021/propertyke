import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { STICKY_COL_1, STICKY_COL_2, type TableRow } from "@/components/ui/PaginatedTable";
import { ClickableUserRow } from "@/components/sections/admin/ClickableUserRow";
import { UsersOfficialsTabs } from "./UsersOfficialsTabs";

export async function UsersPanel() {
  const allUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const users = allUsers.filter((u) => u.role === "USER");
  const officials = allUsers.filter((u) => u.role !== "USER");

  const row = (u: (typeof allUsers)[number], idx: number): TableRow => ({
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
          <StatusBadge status={u.role} />
        </td>
        <td className="py-2 text-zinc-500">{u.createdAt.toLocaleDateString()}</td>
      </ClickableUserRow>
    ),
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Users ({allUsers.length})</h2>
        <DownloadExcelLink dataset="users" />
      </div>
      <p className="mb-2 text-xs text-zinc-500">Click a row for full user details.</p>
      <UsersOfficialsTabs
        head={
          <tr>
            <th className={`py-2 ${STICKY_COL_1}`}>#</th>
            <th className={`py-2 ${STICKY_COL_2}`}>Name</th>
            <th className="py-2">Email</th>
            <th className="py-2">Phone</th>
            <th className="py-2">Role</th>
            <th className="py-2">Joined</th>
          </tr>
        }
        userRows={users.map(row)}
        officialRows={officials.map(row)}
      />
    </div>
  );
}

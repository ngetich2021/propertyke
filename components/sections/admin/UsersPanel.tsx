import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { DownloadExcelLink } from "@/components/ui/DownloadExcelLink";
import { UsersOfficialsTabs } from "./UsersOfficialsTabs";

export async function UsersPanel() {
  const [viewer, allUsers, roles] = await Promise.all([
    requireUser(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { customRole: { select: { id: true, name: true } } },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

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
        userData={users}
        officialData={officials}
        roles={roles}
        isAdmin={viewer.role === "ADMIN"}
      />
    </div>
  );
}

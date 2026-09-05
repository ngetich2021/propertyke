import { prisma } from "@/lib/prisma";
import { ReportsTables } from "./ReportsTables";
import { getRecentActivity } from "@/lib/actions/activity";

export async function ReportsPanel() {
  const [reports, activity] = await Promise.all([
    prisma.report.findMany({
      include: { listing: { include: { owner: true } }, reporter: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getRecentActivity(30),
  ]);

  return <ReportsTables activity={activity} reports={reports} />;
}

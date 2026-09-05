import { prisma } from "@/lib/prisma";
import { SupportTable } from "./SupportTable";
import { slaLabel, SLA_MINUTES } from "@/lib/supportSla";

export async function SupportPanel() {
  const tickets = await prisma.supportTicket.findMany({
    include: { user: true, assignedTo: true, _count: { select: { messages: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const openCount = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;
  const breachedCount = tickets.filter((t) => slaLabel(t).breached).length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Support tickets / live chat ({tickets.length})</h2>
      </div>
      <div className="mb-3 flex gap-4 text-sm">
        <p><span className="font-bold">{openCount}</span> open</p>
        <p><span className={breachedCount > 0 ? "font-bold text-red-600 dark:text-red-400" : "font-bold"}>{breachedCount}</span> breaching {SLA_MINUTES}m SLA</p>
      </div>
      <p className="mb-2 text-xs text-zinc-500">Click a row to read the conversation, reply, assign, or change status.</p>
      <SupportTable tickets={tickets} />
    </div>
  );
}

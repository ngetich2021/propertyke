import "server-only";
import { prisma } from "@/lib/prisma";

export type ActivityItem = {
  id: string;
  at: Date;
  description: string;
};

// A lightweight, synthesized activity feed -- there's no dedicated audit-log
// table, so this pulls the most recent row from each domain table instead.
export async function getRecentActivity(limit = 20): Promise<ActivityItem[]> {
  const [users, listings, orders, ads, reports] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
    prisma.listing.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { owner: true },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { listing: true, buyer: true },
    }),
    prisma.ad.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { listing: true, owner: true },
    }),
    prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { listing: true, reporter: true },
    }),
  ]);

  const items: ActivityItem[] = [
    ...users.map((u) => ({
      id: `user-${u.id}`,
      at: u.createdAt,
      description: `${u.name ?? u.email} joined`,
    })),
    ...listings.map((l) => ({
      id: `listing-${l.id}`,
      at: l.createdAt,
      description: `${l.owner.email} listed "${l.title}" (${l.type.toLowerCase()})`,
    })),
    ...orders.map((o) => ({
      id: `order-${o.id}`,
      at: o.createdAt,
      description: `${o.buyer.email} made an order on "${o.listing?.title ?? "a since-removed listing"}"`,
    })),
    ...ads.map((a) => ({
      id: `ad-${a.id}`,
      at: a.createdAt,
      description: `${a.owner.email} submitted an ad for "${a.listing.title}"`,
    })),
    ...reports.map((r) => ({
      id: `report-${r.id}`,
      at: r.createdAt,
      description: `${r.reporter.email} reported "${r.listing?.title ?? "a since-removed listing"}"`,
    })),
  ];

  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

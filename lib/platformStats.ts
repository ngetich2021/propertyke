import "server-only";
import { prisma } from "@/lib/prisma";

export type PlatformStats = {
  activeLands: number;
  activeProperties: number;
  activeRentals: number;
};

// Live counts injected into the support AI's context (see lib/ai.ts) so it
// can answer "how many X are there" questions directly instead of punting
// to "contact support" for something the app already knows. Counts only
// ACTIVE listings -- what a visitor could actually browse right now, not
// pending/rejected/sold ones.
export async function getPlatformStats(): Promise<PlatformStats> {
  const [activeLands, activeProperties, activeRentals] = await Promise.all([
    prisma.listing.count({ where: { type: "LAND", status: "ACTIVE" } }),
    prisma.listing.count({ where: { type: "PROPERTY", status: "ACTIVE" } }),
    prisma.listing.count({ where: { type: "RENTAL", status: "ACTIVE" } }),
  ]);
  return { activeLands, activeProperties, activeRentals };
}

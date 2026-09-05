import "server-only";
import { prisma } from "@/lib/prisma";
import { pingGemini, pingGroq } from "@/lib/ai";

const PROVIDERS = ["gemini", "groq"] as const;
export type ProviderName = (typeof PROVIDERS)[number];

// Runs a live reachability/latency check against both AI providers and
// persists the result (one row per provider, upserted -- see
// ProviderHealthCheck in schema.prisma). Called from the 6h health cron and
// from the dashboard's "Check now" button -- never from just loading the
// dashboard, so viewing it doesn't cost real API calls on every visit.
export async function refreshProviderHealth(): Promise<void> {
  const [gemini, groq] = await Promise.all([pingGemini(), pingGroq()]);
  await Promise.all([
    prisma.providerHealthCheck.upsert({
      where: { provider: "gemini" },
      create: { provider: "gemini", ...gemini },
      update: gemini,
    }),
    prisma.providerHealthCheck.upsert({
      where: { provider: "groq" },
      create: { provider: "groq", ...groq },
      update: groq,
    }),
  ]);
}

// The last recorded snapshot for each provider -- null for one that's never
// been checked yet (e.g. right after deploy, before the first cron run).
export async function getProviderHealth(): Promise<Record<ProviderName, { ok: boolean; latencyMs: number | null; detail: string | null; checkedAt: Date } | null>> {
  const rows = await prisma.providerHealthCheck.findMany({ where: { provider: { in: [...PROVIDERS] } } });
  const byProvider = new Map(rows.map((r) => [r.provider, r]));
  return {
    gemini: byProvider.get("gemini") ?? null,
    groq: byProvider.get("groq") ?? null,
  };
}

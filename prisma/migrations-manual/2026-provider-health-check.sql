-- Manual incremental migration: latest reachability/latency snapshot per
-- external AI provider (see lib/providerHealth.ts). One row per provider,
-- upserted -- not a log.
CREATE TABLE "ProviderHealthCheck" (
    "provider" TEXT NOT NULL PRIMARY KEY,
    "ok" BOOLEAN NOT NULL,
    "latencyMs" INTEGER,
    "detail" TEXT,
    "checkedAt" DATETIME NOT NULL
);

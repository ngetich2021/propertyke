"use server";

import { revalidatePath } from "next/cache";
import { requireSection } from "@/lib/dal";
import { refreshProviderHealth } from "@/lib/providerHealth";

// Manual trigger for the health dashboard's "Check now" -- the only other
// place this runs is the 6h cron (app/api/cron/health/route.ts), so viewing
// the dashboard never costs a live API call on its own.
export async function manualRefreshProviderHealth(): Promise<void> {
  await requireSection("health");
  await refreshProviderHealth();
  revalidatePath("/");
}

import type { ListingType, AdTargetMode } from "@/app/generated/prisma/client";

export const AD_BASE_DAILY_RATE = 250;

export const AD_TYPE_RATE: Record<ListingType, number> = {
  LAND: 50,
  PROPERTY: 50,
  RENTAL: 25,
};

export const AD_REPEAT_SURCHARGE = 100;

// Airing an ad to everyone reaches far more potential buyers than a
// SELECT/local region, so it costs double the local rate.
export const AD_EVERYWHERE_MULTIPLIER = 2;

// The advertiser never sets the price directly -- it's always derived
// server-side from the listing type, repeat playback, and target mode, so
// the server can recompute and trust it independently of client input.
export function calculateAdDailyRate(
  type: ListingType,
  repeatEnabled: boolean,
  targetMode: AdTargetMode
): number {
  const base = AD_BASE_DAILY_RATE + AD_TYPE_RATE[type] + (repeatEnabled ? AD_REPEAT_SURCHARGE : 0);
  return targetMode === "EVERYWHERE" ? base * AD_EVERYWHERE_MULTIPLIER : base;
}

// Total cost for the whole campaign: the daily rate x how many days it runs.
export function calculateAdTotal(
  type: ListingType,
  repeatEnabled: boolean,
  targetMode: AdTargetMode,
  days: number
): number {
  return calculateAdDailyRate(type, repeatEnabled, targetMode) * days;
}

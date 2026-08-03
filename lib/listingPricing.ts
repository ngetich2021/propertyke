import { DEV_CHARGE_MULTIPLIER } from "@/lib/devPricing";
import type { ListingType } from "@/app/generated/prisma/client";

// Daily hosting fee to keep a listing live -- separate from the listing's
// own sale/rent price. The owner picks how many days to pay for up front;
// once those days run out the listing is taken down (see
// cleanupExpiredListings in lib/actions/maintenance.ts) unless they extend it.
export const LISTING_DAILY_RATE: Record<ListingType, number> = {
  LAND: 20,
  PROPERTY: 30,
  RENTAL: 15,
};

export const LISTING_MIN_DAYS = 1;
export const LISTING_MAX_DAYS = 365;

// Never trust a client-submitted fee -- always recompute server-side from
// the listing type and the number of days requested.
export function calculateListingFee(type: ListingType, days: number): number {
  return LISTING_DAILY_RATE[type] * days * DEV_CHARGE_MULTIPLIER;
}

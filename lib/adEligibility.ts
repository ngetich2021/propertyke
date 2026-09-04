import type { ListingStatus } from "@/app/generated/prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ListingWindow = { status: ListingStatus; endDate: Date | null };

export type AdEligibility =
  | { eligible: true; remainingDays: number | null } // null = no cap (endDate not set, e.g. a pre-existing listing)
  | { eligible: false; reason: string };

// Ads can only run against a listing that's currently live and paid up --
// "any video being up to date paid is eligible for advertising." `from` is
// the point in time the ad's clock would start counting down from (now for
// a fresh ad, or the ad's current endDate when extending one that's still
// running), so a listing with less time left than requested caps rather
// than blocks the campaign.
export function checkAdEligibility(listing: ListingWindow, from: Date = new Date()): AdEligibility {
  const now = new Date();
  if (listing.status !== "ACTIVE") {
    return {
      eligible: false,
      reason: "This listing must be live before you can advertise it.",
    };
  }
  if (listing.endDate && listing.endDate <= now) {
    return {
      eligible: false,
      reason: "This listing's daily rate has lapsed. Pay to extend it in My Listings before advertising it.",
    };
  }
  if (!listing.endDate) {
    return { eligible: true, remainingDays: null };
  }
  const remainingDays = Math.max(1, Math.ceil((listing.endDate.getTime() - from.getTime()) / DAY_MS));
  return { eligible: true, remainingDays };
}

// Clamps a requested ad duration to whatever the listing has left, and
// explains the shortfall so the owner knows how many more listing-days to
// pay for to get the full run they asked for.
export function capAdDays(
  requestedDays: number,
  remainingDays: number | null
): { days: number; notice?: string } {
  if (remainingDays === null || requestedDays <= remainingDays) {
    return { days: requestedDays };
  }
  const short = requestedDays - remainingDays;
  return {
    days: remainingDays,
    notice: `Your listing only has ${remainingDays} day${remainingDays === 1 ? "" : "s"} left on its paid rate, so this ad was set for ${remainingDays} day${remainingDays === 1 ? "" : "s"} instead of ${requestedDays}. Pay for ${short} more day${short === 1 ? "" : "s"} on the listing (in My Listings) to run the full ${requestedDays}-day campaign.`,
  };
}

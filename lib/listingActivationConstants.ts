// Plain constants split out of lib/listingActivation.ts (which is
// server-only -- it also has crypto/prisma logic) so client components that
// only need the numbers, like MyListingsTable's "reactivate by" column,
// don't pull server-only code into the browser bundle.
export const REACTIVATION_INTERVAL_DAYS = 10;
export const REACTIVATION_INTERVAL_MS = REACTIVATION_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
export const REACTIVATION_WARNING_WINDOW_MS = 24 * 60 * 60 * 1000;
export const REACTIVATION_RENOTIFY_INTERVAL_MS = 6 * 60 * 60 * 1000;

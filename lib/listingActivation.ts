import "server-only";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// Independent of the paid days/endDate window (see lib/actions/maintenance.ts
// cleanupExpiredListings) -- a listing must be reconfirmed roughly this often
// or it's hidden from customers (INACTIVE) until reactivated. Never deleted
// for this reason alone.
export const REACTIVATION_INTERVAL_DAYS = 10;
export const REACTIVATION_INTERVAL_MS = REACTIVATION_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
// Same warning/renotify cadence as the existing paid-period reminder
// (EXPIRY_WARNING_WINDOW_MS/EXPIRY_RENOTIFY_INTERVAL_MS in maintenance.ts),
// kept as separate constants since these throttle a different field
// (reactivationNotifiedAt, not expiryNotifiedAt).
export const REACTIVATION_WARNING_WINDOW_MS = 24 * 60 * 60 * 1000;
export const REACTIVATION_RENOTIFY_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function generateActivationToken(): string {
  return randomBytes(32).toString("hex");
}

// Shared by both the public magic-link route (app/api/listings/activate/
// [token]/route.ts) and the authenticated in-app "Activate now" button
// (activateListing in lib/actions/listings.ts) -- an owner reconfirming a
// listing always does the same thing regardless of how they got here.
export async function reactivateListing(listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return null;

  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: {
      status: listing.status === "INACTIVE" ? "ACTIVE" : listing.status,
      lastActivatedAt: new Date(),
      reactivationNotifiedAt: null,
    },
  });
  revalidatePath("/");
  return updated;
}

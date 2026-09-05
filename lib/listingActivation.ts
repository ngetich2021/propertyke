import "server-only";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export {
  REACTIVATION_INTERVAL_DAYS,
  REACTIVATION_INTERVAL_MS,
  REACTIVATION_WARNING_WINDOW_MS,
  REACTIVATION_RENOTIFY_INTERVAL_MS,
} from "@/lib/listingActivationConstants";

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

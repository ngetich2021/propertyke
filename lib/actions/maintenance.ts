import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";

const SUSPENSION_TTL_MS = 8 * 60 * 60 * 1000;
const EXPIRY_WARNING_WINDOW_MS = 24 * 60 * 60 * 1000;
const EXPIRY_RENOTIFY_INTERVAL_MS = 6 * 60 * 60 * 1000;

// Listings/ads an admin has rejected ("suspended") are permanently removed
// once they've sat rejected for more than 8 hours. Run lazily whenever an
// admin views the relevant panel, since this app has no cron scheduler.
export async function cleanupExpiredSuspensions() {
  const cutoff = new Date(Date.now() - SUSPENSION_TTL_MS);
  const [listings, ads] = await Promise.all([
    prisma.listing.deleteMany({ where: { status: "REJECTED", updatedAt: { lt: cutoff } } }),
    prisma.ad.deleteMany({ where: { status: "REJECTED", updatedAt: { lt: cutoff } } }),
  ]);
  return { listings: listings.count, ads: ads.count };
}

// A listing only stays live for the number of days its owner paid for
// (endDate, set when an admin approves it -- see setListingStatus). Once
// that window lapses without the owner paying to extend it (extendListing),
// it comes down entirely rather than lingering in a stale "ACTIVE" state.
// Run lazily wherever listings are read, same as cleanupExpiredSuspensions.
export async function cleanupExpiredListings() {
  const { count } = await prisma.listing.deleteMany({
    where: { status: "ACTIVE", endDate: { lt: new Date() } },
  });
  return count;
}

// Same idea for ads: once the paid-for run (endDate, set on admin approval
// -- see updateAdStatus) lapses without being extended (extendAd), it's
// deleted outright, same as a lapsed listing.
export async function cleanupExpiredAds() {
  const { count } = await prisma.ad.deleteMany({
    where: { status: "ACTIVE", endDate: { lt: new Date() } },
  });
  return count;
}

// Warns an owner once their listing/ad has <=24h of paid time left, and
// keeps re-warning roughly every 6h (via expiryNotifiedAt) until it's
// extended or it lapses and cleanupExpiredListings/cleanupExpiredAds takes
// it down. Lazy (no cron), so it only actually fires when someone loads a
// page that triggers it -- see the cleanupExpired* call sites.
export async function notifyExpiringListings() {
  const now = new Date();
  const soon = new Date(now.getTime() + EXPIRY_WARNING_WINDOW_MS);
  const renotifyCutoff = new Date(now.getTime() - EXPIRY_RENOTIFY_INTERVAL_MS);

  const listings = await prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      endDate: { gt: now, lte: soon },
      OR: [{ expiryNotifiedAt: null }, { expiryNotifiedAt: { lt: renotifyCutoff } }],
    },
    include: { owner: true },
  });
  if (listings.length === 0) return 0;

  for (const listing of listings) {
    const hoursLeft = Math.max(1, Math.round((listing.endDate!.getTime() - now.getTime()) / (60 * 60 * 1000)));
    after(() =>
      sendMail(
        listing.owner.email,
        `"${listing.title}" comes down in ~${hoursLeft}h`,
        `<p>Hi ${listing.owner.name ?? ""},</p>
         <p>Your listing <strong>${listing.title}</strong> has about ${hoursLeft} hour(s) left on its paid listing days.</p>
         <p>Extend it from My Listings before it lapses, or it will be automatically removed.</p>`
      )
    );
  }

  await prisma.listing.updateMany({
    where: { id: { in: listings.map((l) => l.id) } },
    data: { expiryNotifiedAt: now },
  });
  return listings.length;
}

// Same reminder cadence as notifyExpiringListings, for ads.
export async function notifyExpiringAds() {
  const now = new Date();
  const soon = new Date(now.getTime() + EXPIRY_WARNING_WINDOW_MS);
  const renotifyCutoff = new Date(now.getTime() - EXPIRY_RENOTIFY_INTERVAL_MS);

  const ads = await prisma.ad.findMany({
    where: {
      status: "ACTIVE",
      endDate: { gt: now, lte: soon },
      OR: [{ expiryNotifiedAt: null }, { expiryNotifiedAt: { lt: renotifyCutoff } }],
    },
    include: { owner: true, listing: true },
  });
  if (ads.length === 0) return 0;

  for (const ad of ads) {
    const hoursLeft = Math.max(1, Math.round((ad.endDate!.getTime() - now.getTime()) / (60 * 60 * 1000)));
    after(() =>
      sendMail(
        ad.owner.email,
        `Your ad for "${ad.productName ?? ad.listing.title}" stops airing in ~${hoursLeft}h`,
        `<p>Hi ${ad.owner.name ?? ""},</p>
         <p>Your ad for <strong>${ad.productName ?? ad.listing.title}</strong> has about ${hoursLeft} hour(s) of paid airtime left.</p>
         <p>Extend it from Advertise before it lapses, or it will be automatically removed.</p>`
      )
    );
  }

  await prisma.ad.updateMany({
    where: { id: { in: ads.map((a) => a.id) } },
    data: { expiryNotifiedAt: now },
  });
  return ads.length;
}

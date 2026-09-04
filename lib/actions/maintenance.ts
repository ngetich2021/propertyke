import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import {
  REACTIVATION_INTERVAL_MS,
  REACTIVATION_WARNING_WINDOW_MS,
  REACTIVATION_RENOTIFY_INTERVAL_MS,
  generateActivationToken,
} from "@/lib/listingActivation";

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
// Includes INACTIVE too (a listing separately hidden for missing its
// 10-day reactivation, see deactivateUnrenewedListings below) -- the paid
// window's expiry is independent of activation state and still applies.
// Run lazily wherever listings are read, same as cleanupExpiredSuspensions.
export async function cleanupExpiredListings() {
  const { count } = await prisma.listing.deleteMany({
    where: { status: { in: ["ACTIVE", "INACTIVE"] }, endDate: { lt: new Date() } },
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

// Independent of the paid days/endDate reminder above: warns an owner once
// their listing is within 24h of its 10-day reactivation deadline
// (lastActivatedAt + REACTIVATION_INTERVAL_MS), throttled the same way via
// reactivationNotifiedAt. Lazily generates+persists an activationToken for
// any listing that doesn't have one yet (e.g. approved before this feature
// existed) so the emailed link always works. See deactivateUnrenewedListings
// for what happens if the deadline passes unacknowledged.
export async function notifyReactivationNeeded() {
  const now = new Date();
  const warnFrom = new Date(now.getTime() - REACTIVATION_INTERVAL_MS);
  const warnUntil = new Date(warnFrom.getTime() + REACTIVATION_WARNING_WINDOW_MS);
  const renotifyCutoff = new Date(now.getTime() - REACTIVATION_RENOTIFY_INTERVAL_MS);

  const listings = await prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      lastActivatedAt: { gt: warnFrom, lte: warnUntil },
      OR: [{ reactivationNotifiedAt: null }, { reactivationNotifiedAt: { lt: renotifyCutoff } }],
    },
    include: { owner: true },
  });
  if (listings.length === 0) return 0;

  const appUrl = (process.env.APP_URL ?? "").replace(/\/+$/, "");

  for (const listing of listings) {
    const token = listing.activationToken ?? generateActivationToken();
    if (!listing.activationToken) {
      await prisma.listing.update({ where: { id: listing.id }, data: { activationToken: token } });
    }
    const activateUrl = `${appUrl}/api/listings/activate/${token}`;
    after(() =>
      sendMail(
        listing.owner.email,
        `Keep "${listing.title}" visible -- activation needed`,
        `<p>Hi ${listing.owner.name ?? ""},</p>
         <p>Your listing <strong>${listing.title}</strong> needs to be reactivated roughly every 10 days to stay visible to customers.</p>
         <p><a href="${activateUrl}">Click here to activate it</a> and keep it live for everyone.</p>
         <p>If you don't activate it in time, it will be hidden from customers until you do -- it won't be deleted.</p>`
      )
    );
  }

  await prisma.listing.updateMany({
    where: { id: { in: listings.map((l) => l.id) } },
    data: { reactivationNotifiedAt: now },
  });
  return listings.length;
}

// Hides (never deletes) any ACTIVE listing whose 10-day reactivation
// deadline has passed without the owner clicking Activate -- see
// notifyReactivationNeeded above and reactivateListing in
// lib/listingActivation.ts for how it comes back.
export async function deactivateUnrenewedListings() {
  const cutoff = new Date(Date.now() - REACTIVATION_INTERVAL_MS);

  // An ACTIVE listing that's never had lastActivatedAt set at all (legacy
  // rows from before this feature existed, whose startDate was also null so
  // the migration's backfill couldn't cover them) gets a fresh 10-day grace
  // period starting now, instead of being treated as instantly overdue --
  // only a listing that actually had a chance to be reconfirmed and let it
  // lapse should ever get hidden by the check below.
  await prisma.listing.updateMany({
    where: { status: "ACTIVE", lastActivatedAt: null },
    data: { lastActivatedAt: new Date() },
  });

  const { count } = await prisma.listing.updateMany({
    where: { status: "ACTIVE", lastActivatedAt: { lt: cutoff } },
    data: { status: "INACTIVE" },
  });
  return count;
}

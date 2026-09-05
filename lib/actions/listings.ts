"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireSection, getSession } from "@/lib/dal";
import { listingFormSchema, listingStatusFormSchema, nearbySearchSchema } from "@/lib/schemas";
import type { ActionState } from "@/lib/schemas";
import { haversineDistanceKm } from "@/lib/geo";
import { reverseGeocode, reverseGeocodeAddress, searchPlace } from "@/lib/geocode";
import { normalizeListingFields } from "@/lib/listingFields";
import {
  cleanupExpiredListings,
  notifyExpiringListings,
  notifyReactivationNeeded,
  deactivateUnrenewedListings,
} from "@/lib/actions/maintenance";
import { reactivateListing, generateActivationToken } from "@/lib/listingActivation";
import { canManageOwner } from "@/lib/ownerAccess";
import type { AdminSectionKey } from "@/lib/nav";
import type { ListingType } from "@/app/generated/prisma/client";

// Lets the listing form auto-fill Address from wherever was just picked on
// the map, instead of asking the owner to type out the same location twice.
export async function getAddressSuggestion(latitude: number, longitude: number) {
  const parsed = nearbySearchSchema.safeParse({ latitude, longitude });
  if (!parsed.success) return null;
  return reverseGeocodeAddress(parsed.data.latitude, parsed.data.longitude);
}

// A pair of raw numbers, e.g. "1.234, 36.789" or "1.234 36.789" -- covers
// coordinates copy-pasted from another map app (Google Maps, WhatsApp's
// shared-location message, etc.) without requiring a particular separator.
const COORDINATE_PAIR = /^\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*$/;

export type MapLocationResult = { lat: number; lng: number; label: string | null } | { error: string };

// Powers the map search box (see LocationMapInner): lets someone jump
// straight to a location they were shared -- either as raw coordinates or as
// a place name (e.g. "Kapsowar") -- instead of only being able to tap around
// the map to find it.
export async function findMapLocation(query: string): Promise<MapLocationResult> {
  const q = query.trim();
  if (!q) return { error: "Type coordinates or a place name." };

  const coordMatch = q.match(COORDINATE_PAIR);
  if (coordMatch) {
    const lat = Number(coordMatch[1]);
    const lng = Number(coordMatch[2]);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { error: "Those coordinates are out of range." };
    }
    return { lat, lng, label: null };
  }

  const match = await searchPlace(q);
  if (!match) return { error: `Couldn't find "${q}".` };
  return match;
}

// Listings are free -- this creates the listing directly and it's live
// immediately (ACTIVE, no admin pre-approval). Only Ads (the separate
// "Advertise" promotion feature) cost money. Admin retains the ability to
// reject/suspend a live listing afterward (see setListingStatus,
// cleanupExpiredSuspensions) -- it's just not required before it's visible.
export async function createListing(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = listingFormSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description"),
    price: formData.get("price"),
    currency: formData.get("currency") || "KES",
    address: formData.get("address") || undefined,
    latitude: formData.get("latitude") || undefined,
    longitude: formData.get("longitude") || undefined,
    bedrooms: formData.get("bedrooms") || undefined,
    bathrooms: formData.get("bathrooms") || undefined,
    acreage: formData.get("acreage") || undefined,
    rentPerMonth: formData.get("rentPerMonth") || undefined,
    images: formData.getAll("images").filter(Boolean),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // A team member (see OwnerDelegation in schema.prisma) can post a listing
  // on the owner's behalf via an "Acting for" picker in the create form --
  // defaults to their own account otherwise. Re-verified server-side rather
  // than trusted from the hidden field, same as every other ownerId check
  // in this file.
  const actingForOwnerId = String(formData.get("actingForOwnerId") ?? "") || user.id;
  if (actingForOwnerId !== user.id && !(await canManageOwner(user.id, actingForOwnerId, "listings"))) {
    return { error: "You don't have access to post listings for that account." };
  }
  const owner = actingForOwnerId === user.id ? user : await prisma.user.findUnique({ where: { id: actingForOwnerId } });
  if (!owner) return { error: "That account no longer exists." };

  if ((parsed.data.type === "PROPERTY" || parsed.data.type === "RENTAL") && !owner.businessName) {
    return { error: "The owner needs a business/company name in Settings before listing a property or rental." };
  }

  await prisma.listing.create({
    data: {
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description,
      price: parsed.data.price,
      currency: parsed.data.currency,
      address: parsed.data.address ?? null,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      images: JSON.stringify(parsed.data.images),
      ...normalizeListingFields(parsed.data.type, parsed.data),
      status: "ACTIVE",
      lastActivatedAt: new Date(),
      activationToken: generateActivationToken(),
      ownerId: owner.id,
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function updateListing(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const listingId = String(formData.get("listingId") ?? "");

  const existing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!existing) {
    return { error: "This listing no longer exists." };
  }
  if (
    existing.ownerId !== user.id &&
    user.role !== "ADMIN" &&
    !(await canManageOwner(user.id, existing.ownerId, "listings"))
  ) {
    return { error: "You can only edit your own listings." };
  }

  const parsed = listingFormSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description"),
    price: formData.get("price"),
    currency: formData.get("currency") || "KES",
    address: formData.get("address") || undefined,
    latitude: formData.get("latitude") || undefined,
    longitude: formData.get("longitude") || undefined,
    bedrooms: formData.get("bedrooms") || undefined,
    bathrooms: formData.get("bathrooms") || undefined,
    acreage: formData.get("acreage") || undefined,
    rentPerMonth: formData.get("rentPerMonth") || undefined,
    images: formData.getAll("images").filter(Boolean),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      ...parsed.data,
      // Prisma silently skips `undefined` fields on update instead of
      // clearing them, so switching a listing's type (e.g. RENTAL ->
      // PROPERTY) would otherwise leave its old rentPerMonth/acreage/etc in
      // place forever -- explicitly null out whatever doesn't apply to the
      // new type. See normalizeListingFields.
      ...normalizeListingFields(parsed.data.type, parsed.data),
      images: JSON.stringify(parsed.data.images),
      // Editing counts as reconfirming the listing is still wanted, same
      // spirit as the 10-day reactivation check (see lib/listingActivation.ts)
      // -- no more admin re-review or paid-window reset since listings are
      // free and don't need either anymore.
      lastActivatedAt: new Date(),
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function deleteListing(formData: FormData): Promise<void> {
  const user = await requireUser();
  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) return;

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return;
  if (
    listing.ownerId !== user.id &&
    user.role !== "ADMIN" &&
    !(await canManageOwner(user.id, listing.ownerId, "listings"))
  )
    return;

  await prisma.listing.delete({ where: { id: listingId } });
  revalidatePath("/");
}

// Which delegated admin duty (see lib/permissions.ts) covers a given listing
// type -- matches DATASET in AdminListingsPanel, which splits the same three
// types across the "lands"/"properties"/"housetolet" sections.
const LISTING_TYPE_SECTION: Record<ListingType, AdminSectionKey> = {
  LAND: "lands",
  PROPERTY: "properties",
  RENTAL: "housetolet",
};

export async function setListingStatus(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = listingStatusFormSchema.safeParse({
    listingId: formData.get("listingId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId } });
  if (!listing) return { error: "Listing not found." };
  await requireSection(LISTING_TYPE_SECTION[listing.type]);

  const data: {
    status: typeof parsed.data.status;
    lastActivatedAt?: Date;
    reactivationNotifiedAt?: null;
    activationToken?: string;
  } = {
    status: parsed.data.status,
  };
  if (parsed.data.status === "ACTIVE") {
    // Admin manually reinstating a listing (e.g. after it was REJECTED) --
    // restarts the independent 10-day reactivation clock (see
    // lib/listingActivation.ts), same as createListing/updateListing do.
    data.lastActivatedAt = new Date();
    data.reactivationNotifiedAt = null;
    if (!listing.activationToken) data.activationToken = generateActivationToken();
  }

  await prisma.listing.update({
    where: { id: parsed.data.listingId },
    data,
  });

  revalidatePath("/");
  return { success: true };
}

export async function countListings(type: ListingType) {
  // The public browse tabs are the most common read path in the app, so
  // this doubles as the main place lapsed listings actually come down (and
  // expiry/reactivation warnings actually go out) -- see
  // cleanupExpiredListings / notifyExpiringListings /
  // notifyReactivationNeeded / deactivateUnrenewedListings.
  await Promise.all([
    cleanupExpiredListings(),
    notifyExpiringListings(),
    notifyReactivationNeeded(),
    deactivateUnrenewedListings(),
  ]);
  return prisma.listing.count({ where: { type, status: "ACTIVE" } });
}

// A compact projection used to preview a listing inline (e.g. from an ad)
// without navigating away from the current page.
export async function getListingSummary(listingId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      type: true,
      title: true,
      description: true,
      price: true,
      currency: true,
      rentPerMonth: true,
      bedrooms: true,
      bathrooms: true,
      acreage: true,
      address: true,
      latitude: true,
      longitude: true,
      images: true,
      status: true,
    },
  });
  // Purely a customer-facing preview (e.g. ad reveal) -- an INACTIVE listing
  // (missed its 10-day reactivation) shouldn't surface here even if it was
  // still ACTIVE when the ad slot was originally served.
  if (listing?.status === "INACTIVE") return null;
  return listing;
}

// Full listing details for the in-place detail modal (replaces navigating to
// /listing/[id]). Only ever called from a client component, so the owner is
// projected down to a minimal set of fields instead of the raw User row.
// Phone is shown to any non-owner viewer (signed in or not) so a buyer can
// call directly -- the in-app order form isn't the only way to reach out.
export async function getListingDetail(listingId: string) {
  const [listing, session] = await Promise.all([
    prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true, businessName: true, verifiedUntil: true } },
      },
    }),
    getSession(),
  ]);
  if (!listing) return null;

  const isOwner = session?.user.id === listing.ownerId;
  const isAdmin = session?.user.role === "ADMIN";
  // A team member delegated "listings" access (see OwnerDelegation) manages
  // this listing exactly like its owner would -- edit/delete controls, no
  // buyer-flow (Express interest/Report), reactivation visibility -- even
  // though they're not literally `isOwner`.
  const canManage =
    isOwner || isAdmin || (session ? await canManageOwner(session.user.id, listing.ownerId, "listings") : false);
  // Hidden from everyone except whoever can manage it while it's missing
  // its 10-day reactivation -- they still need to see it to reactivate it.
  if (listing.status === "INACTIVE" && !canManage) return null;

  const nearbyTown =
    listing.latitude != null && listing.longitude != null
      ? await reverseGeocode(listing.latitude, listing.longitude)
      : null;

  return {
    listing,
    nearbyTown,
    isOwner,
    isAdmin,
    canManage,
    signedIn: !!session,
    // Prefills the order form's contact number so a buyer who already has a
    // phone on file isn't retyping it -- still just a starting point, the
    // field stays editable since this order might use a different number.
    viewerPhone: session?.user.phone ?? null,
  };
}

export async function getPendingListingCount(type: ListingType) {
  return prisma.listing.count({ where: { type, status: "PENDING" } });
}

// An unverified owner's listing is only discoverable in nearby search within
// this radius, regardless of what radius the searcher picked -- see
// getNearbyListings below. A verified owner's listing has no such cap.
const UNVERIFIED_SEARCH_RADIUS_KM = 0.5;

export async function getNearbyListings(
  type: ListingType,
  latitude: number,
  longitude: number,
  radiusKm: number | null = 10
) {
  const parsed = nearbySearchSchema.safeParse({ latitude, longitude });
  if (!parsed.success) return [];

  const listings = await prisma.listing.findMany({
    where: {
      type,
      status: "ACTIVE",
      latitude: { not: null },
      longitude: { not: null },
    },
    include: { owner: { select: { verifiedUntil: true } } },
    take: 500,
  });

  const now = new Date();

  return listings
    .map(({ owner, ...listing }) => ({
      ...listing,
      distanceKm: haversineDistanceKm(
        parsed.data.latitude,
        parsed.data.longitude,
        listing.latitude!,
        listing.longitude!
      ),
      isOwnerVerified: !!owner.verifiedUntil && owner.verifiedUntil > now,
    }))
    .filter((listing) => listing.isOwnerVerified || listing.distanceKm <= UNVERIFIED_SEARCH_RADIUS_KM)
    .filter((listing) => radiusKm === null || listing.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 50);
}

// Owner-facing fallback for the emailed magic link (see
// app/api/listings/activate/[token]/route.ts) -- lets a signed-in owner
// reactivate straight from My Listings if they don't have the email handy.
export async function activateListing(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const listingId = String(formData.get("listingId") ?? "");

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    return { error: "This listing no longer exists." };
  }
  if (
    listing.ownerId !== user.id &&
    user.role !== "ADMIN" &&
    !(await canManageOwner(user.id, listing.ownerId, "listings"))
  ) {
    return { error: "You can only activate your own listings." };
  }

  await reactivateListing(listingId);
  return { success: true };
}

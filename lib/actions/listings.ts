"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin, getSession } from "@/lib/dal";
import {
  listingFormSchema,
  listingStatusFormSchema,
  extendListingFormSchema,
  nearbySearchSchema,
} from "@/lib/schemas";
import type { ActionState } from "@/lib/schemas";
import { haversineDistanceKm } from "@/lib/geo";
import { reverseGeocode, reverseGeocodeAddress } from "@/lib/geocode";
import { calculateListingFee } from "@/lib/listingPricing";
import { normalizeListingFields } from "@/lib/listingFields";
import { cleanupExpiredListings, notifyExpiringListings } from "@/lib/actions/maintenance";
import type { ListingType } from "@/app/generated/prisma/client";

// Lets the listing form auto-fill Address from wherever was just picked on
// the map, instead of asking the owner to type out the same location twice.
export async function getAddressSuggestion(latitude: number, longitude: number) {
  const parsed = nearbySearchSchema.safeParse({ latitude, longitude });
  if (!parsed.success) return null;
  return reverseGeocodeAddress(parsed.data.latitude, parsed.data.longitude);
}

export async function createListing(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  if (!user.phone) {
    return { error: "Add a phone number in Settings before posting a listing." };
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
    days: formData.get("days") || 30,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.listing.create({
    data: {
      ...parsed.data,
      // Never trust the client to have only submitted fields that apply to
      // the chosen type -- always derive that server-side. See
      // normalizeListingFields.
      ...normalizeListingFields(parsed.data.type, parsed.data),
      images: JSON.stringify(parsed.data.images),
      // Never trust a client-submitted fee -- always derive it server-side
      // from the listing type + number of days requested.
      feeAmount: calculateListingFee(parsed.data.type, parsed.data.days),
      ownerId: user.id,
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
  if (existing.ownerId !== user.id && user.role !== "ADMIN") {
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
    days: formData.get("days") || existing.days,
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
      feeAmount: calculateListingFee(parsed.data.type, parsed.data.days),
      // Editing sends it back to admin for re-review, so the paid window
      // resets too -- it's reinstated (with a fresh startDate/endDate) the
      // next time an admin approves it.
      status: "PENDING",
      startDate: null,
      endDate: null,
      expiryNotifiedAt: null,
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
  if (listing.ownerId !== user.id && user.role !== "ADMIN") return;

  await prisma.listing.delete({ where: { id: listingId } });
  revalidatePath("/");
}

// Lets an owner (or admin) pay for more days without going back through
// admin re-review -- nothing about the listing's content changed, just how
// long it stays live. Extends from whichever is later, `endDate` or now, so
// a lapsed listing doesn't get backdated extra days it never actually ran.
export async function extendListing(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = extendListingFormSchema.safeParse({
    listingId: formData.get("listingId"),
    extraDays: formData.get("extraDays"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId } });
  if (!listing) {
    return { error: "This listing no longer exists." };
  }
  if (listing.ownerId !== user.id && user.role !== "ADMIN") {
    return { error: "You can only extend your own listings." };
  }
  if (listing.status !== "ACTIVE") {
    return { error: "Only a live listing can be extended -- resubmit it for review instead." };
  }

  const base = listing.endDate && listing.endDate > new Date() ? listing.endDate : new Date();
  const endDate = new Date(base.getTime() + parsed.data.extraDays * 24 * 60 * 60 * 1000);
  const fee = calculateListingFee(listing.type, parsed.data.extraDays);

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      endDate,
      days: listing.days + parsed.data.extraDays,
      feeAmount: (listing.feeAmount ?? 0) + fee,
      expiryNotifiedAt: null,
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function setListingStatus(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = listingStatusFormSchema.safeParse({
    listingId: formData.get("listingId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data: {
    status: typeof parsed.data.status;
    startDate?: Date;
    endDate?: Date;
    expiryNotifiedAt?: null;
  } = {
    status: parsed.data.status,
  };
  if (parsed.data.status === "ACTIVE") {
    const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId } });
    data.startDate = new Date();
    data.endDate = new Date(Date.now() + (listing?.days ?? 30) * 24 * 60 * 60 * 1000);
    data.expiryNotifiedAt = null;
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
  // expiry warnings actually go out) -- see cleanupExpiredListings /
  // notifyExpiringListings.
  await Promise.all([cleanupExpiredListings(), notifyExpiringListings()]);
  return prisma.listing.count({ where: { type, status: "ACTIVE" } });
}

// A compact projection used to preview a listing inline (e.g. from an ad)
// without navigating away from the current page.
export async function getListingSummary(listingId: string) {
  return prisma.listing.findUnique({
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
      include: { owner: { select: { id: true, name: true, email: true, phone: true, businessName: true } } },
    }),
    getSession(),
  ]);
  if (!listing) return null;

  const nearbyTown =
    listing.latitude != null && listing.longitude != null
      ? await reverseGeocode(listing.latitude, listing.longitude)
      : null;

  return {
    listing,
    nearbyTown,
    isOwner: session?.user.id === listing.ownerId,
    isAdmin: session?.user.role === "ADMIN",
    signedIn: !!session,
  };
}

export async function getPendingListingCount(type: ListingType) {
  return prisma.listing.count({ where: { type, status: "PENDING" } });
}

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
    take: 500,
  });

  return listings
    .map((listing) => ({
      ...listing,
      distanceKm: haversineDistanceKm(
        parsed.data.latitude,
        parsed.data.longitude,
        listing.latitude!,
        listing.longitude!
      ),
    }))
    .filter((listing) => radiusKm === null || listing.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 50);
}

"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/dal";
import { adFormSchema, adStatusFormSchema, extendAdFormSchema, deleteAdFormSchema } from "@/lib/schemas";
import type { ActionState } from "@/lib/schemas";
import { getYouTubeId } from "@/lib/youtube";
import { parseAdMedia, type AdMedia } from "@/lib/adMedia";
import { haversineDistanceKm } from "@/lib/geo";
import { sendMail } from "@/lib/mail";
import { calculateAdTotal } from "@/lib/adPricing";
import { checkAdEligibility, capAdDays } from "@/lib/adEligibility";
import { cleanupExpiredAds, notifyExpiringAds } from "@/lib/actions/maintenance";
import { toMpesaPhone, initiateStkPush } from "@/lib/mpesa";
import type { ListingType } from "@/app/generated/prisma/client";

// Validates the ad and sends the M-Pesa prompt for its campaign cost -- the
// ad itself isn't created here. It's only actually created once that
// payment resolves to SUCCESS (see lib/paymentApply.ts).
export async function initiateAdPayment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  if (!user.phone) {
    return { error: "Add a phone number in Settings before posting an ad." };
  }

  const parsed = adFormSchema.safeParse({
    listingId: formData.get("listingId"),
    companyName: formData.get("companyName"),
    productName: formData.get("productName"),
    productDescription: formData.get("productDescription"),
    companyContact: formData.get("companyContact"),
    mediaType: formData.getAll("mediaType"),
    mediaUrl: formData.getAll("mediaUrl"),
    targetMode: formData.get("targetMode") || "EVERYWHERE",
    targetLatitude: formData.get("targetLatitude") || undefined,
    targetLongitude: formData.get("targetLongitude") || undefined,
    targetRadiusKm: formData.get("targetRadiusKm") || undefined,
    repeatEnabled: formData.get("repeatEnabled"),
    repeatCount: formData.get("repeatCount") || undefined,
    days: formData.get("days") || 1,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  if (parsed.data.mediaType.length !== parsed.data.mediaUrl.length) {
    return { error: "Media entries are mismatched. Please try again." };
  }

  if (
    parsed.data.targetMode === "SELECT" &&
    (parsed.data.targetLatitude === undefined ||
      parsed.data.targetLongitude === undefined ||
      parsed.data.targetRadiusKm === undefined)
  ) {
    return { error: "Pick a location and radius to target a specific area." };
  }

  if (parsed.data.repeatEnabled && (!parsed.data.repeatCount || parsed.data.repeatCount < 1)) {
    return { error: "Enter how many times per day the ad should repeat." };
  }

  const media: AdMedia[] = parsed.data.mediaType.map((type, i) => ({
    type,
    url: parsed.data.mediaUrl[i],
  }));

  const invalidYoutube = media.find((m) => m.type === "youtube" && !getYouTubeId(m.url));
  if (invalidYoutube) {
    return { error: `"${invalidYoutube.url}" doesn't look like a valid YouTube link.` };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: parsed.data.listingId },
  });
  if (!listing || (listing.ownerId !== user.id && user.role !== "ADMIN")) {
    return { error: "You can only advertise your own listings." };
  }

  // Advertising is only allowed on a listing that's currently live and paid
  // up -- if its own daily rate has lapsed (or was never approved), tell
  // the owner to sort that out first instead of accepting money for a spot
  // that can't actually air. See lib/adEligibility.ts.
  const eligibility = checkAdEligibility(listing);
  if (!eligibility.eligible) {
    return { error: eligibility.reason };
  }
  const { days, notice } = capAdDays(parsed.data.days, eligibility.remainingDays);

  const mpesaPhone = toMpesaPhone(String(formData.get("mpesaPhone") ?? ""));
  if (!mpesaPhone) {
    return { fieldErrors: { mpesaPhone: ["Enter a valid Safaricom number, e.g. 0712345678."] } };
  }

  // Never trust a client-submitted price: always derive it from the
  // listing type, repeat option, target mode (EVERYWHERE pays double a
  // SELECT/local region) and the (possibly capped) number of days,
  // server-side.
  const amount = calculateAdTotal(listing.type, parsed.data.repeatEnabled, parsed.data.targetMode, days);

  const stk = await initiateStkPush({
    phone: mpesaPhone,
    amount,
    accountReference: "Ad fee",
    transactionDesc: "Ad fee",
  });
  if (!stk.ok) {
    return { error: stk.error };
  }

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      purpose: "AD_CREATE",
      amount,
      phone: mpesaPhone,
      payload: JSON.stringify({
        listingId: listing.id,
        days,
        companyName: parsed.data.companyName,
        productName: parsed.data.productName,
        productDescription: parsed.data.productDescription,
        companyContact: parsed.data.companyContact,
        media,
        targetMode: parsed.data.targetMode,
        targetLatitude: parsed.data.targetMode === "SELECT" ? parsed.data.targetLatitude : null,
        targetLongitude: parsed.data.targetMode === "SELECT" ? parsed.data.targetLongitude : null,
        targetRadiusKm: parsed.data.targetMode === "SELECT" ? parsed.data.targetRadiusKm : null,
        repeatEnabled: parsed.data.repeatEnabled,
        repeatCount: parsed.data.repeatEnabled ? parsed.data.repeatCount : null,
      }),
      merchantRequestId: stk.merchantRequestId,
      checkoutRequestId: stk.checkoutRequestId,
    },
  });

  return { pendingPayment: { paymentId: payment.id, amount, phone: mpesaPhone }, notice };
}

export async function updateAd(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const adId = String(formData.get("adId") ?? "");

  const existing = await prisma.ad.findUnique({ where: { id: adId }, include: { listing: true } });
  if (!existing) {
    return { error: "This ad no longer exists." };
  }
  if (existing.ownerId !== user.id && user.role !== "ADMIN") {
    return { error: "You can only edit your own ads." };
  }

  const parsed = adFormSchema.safeParse({
    listingId: existing.listingId,
    companyName: formData.get("companyName"),
    productName: formData.get("productName"),
    productDescription: formData.get("productDescription"),
    companyContact: formData.get("companyContact"),
    mediaType: formData.getAll("mediaType"),
    mediaUrl: formData.getAll("mediaUrl"),
    targetMode: formData.get("targetMode") || "EVERYWHERE",
    targetLatitude: formData.get("targetLatitude") || undefined,
    targetLongitude: formData.get("targetLongitude") || undefined,
    targetRadiusKm: formData.get("targetRadiusKm") || undefined,
    repeatEnabled: formData.get("repeatEnabled"),
    repeatCount: formData.get("repeatCount") || undefined,
    days: formData.get("days") || existing.days,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  if (parsed.data.mediaType.length !== parsed.data.mediaUrl.length) {
    return { error: "Media entries are mismatched. Please try again." };
  }

  if (
    parsed.data.targetMode === "SELECT" &&
    (parsed.data.targetLatitude === undefined ||
      parsed.data.targetLongitude === undefined ||
      parsed.data.targetRadiusKm === undefined)
  ) {
    return { error: "Pick a location and radius to target a specific area." };
  }

  if (parsed.data.repeatEnabled && (!parsed.data.repeatCount || parsed.data.repeatCount < 1)) {
    return { error: "Enter how many times per day the ad should repeat." };
  }

  const media: AdMedia[] = parsed.data.mediaType.map((type, i) => ({
    type,
    url: parsed.data.mediaUrl[i],
  }));

  const invalidYoutube = media.find((m) => m.type === "youtube" && !getYouTubeId(m.url));
  if (invalidYoutube) {
    return { error: `"${invalidYoutube.url}" doesn't look like a valid YouTube link.` };
  }

  const eligibility = checkAdEligibility(existing.listing);
  if (!eligibility.eligible) {
    return { error: eligibility.reason };
  }
  const { days, notice } = capAdDays(parsed.data.days, eligibility.remainingDays);

  await prisma.ad.update({
    where: { id: adId },
    data: {
      amount: calculateAdTotal(existing.listing.type, parsed.data.repeatEnabled, parsed.data.targetMode, days),
      days,
      companyName: parsed.data.companyName,
      productName: parsed.data.productName,
      productDescription: parsed.data.productDescription,
      companyContact: parsed.data.companyContact,
      media: JSON.stringify(media),
      targetMode: parsed.data.targetMode,
      targetLatitude: parsed.data.targetMode === "SELECT" ? parsed.data.targetLatitude : null,
      targetLongitude: parsed.data.targetMode === "SELECT" ? parsed.data.targetLongitude : null,
      targetRadiusKm: parsed.data.targetMode === "SELECT" ? parsed.data.targetRadiusKm : null,
      repeatEnabled: parsed.data.repeatEnabled,
      repeatCount: parsed.data.repeatEnabled ? parsed.data.repeatCount : null,
      // Editing sends it back to admin for re-review, so the paid window
      // resets too -- it's reinstated the next time an admin approves it.
      status: "PENDING",
      startDate: null,
      endDate: null,
      adminNote: null,
    },
  });

  revalidatePath("/");
  return { success: true, notice };
}

export async function deleteAd(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = deleteAdFormSchema.safeParse({ adId: formData.get("adId") });
  if (!parsed.success) return;

  const ad = await prisma.ad.findUnique({ where: { id: parsed.data.adId } });
  if (!ad) return;
  if (ad.ownerId !== user.id && user.role !== "ADMIN") return;

  await prisma.ad.delete({ where: { id: parsed.data.adId } });
  revalidatePath("/");
}

// Lets an owner (or admin) pay for more days without going back through
// admin re-review. Sends the M-Pesa prompt for the extra days; the
// extension itself is only applied once that payment succeeds (see
// lib/paymentApply.ts).
export async function initiateExtendAdPayment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = extendAdFormSchema.safeParse({
    adId: formData.get("adId"),
    extraDays: formData.get("extraDays"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const ad = await prisma.ad.findUnique({ where: { id: parsed.data.adId }, include: { listing: true } });
  if (!ad) {
    return { error: "This ad no longer exists." };
  }
  if (ad.ownerId !== user.id && user.role !== "ADMIN") {
    return { error: "You can only extend your own ads." };
  }
  if (ad.status !== "ACTIVE" && ad.status !== "EXPIRED") {
    return { error: "Only a live or expired ad can be extended." };
  }

  const base = ad.endDate && ad.endDate > new Date() ? ad.endDate : new Date();

  // The ad can't outrun its own listing: eligibility is checked against now
  // (is the listing currently live/paid at all), then the extension is
  // capped against how much runway the listing has left from `base` (the
  // point the extra days would start counting from).
  const eligibility = checkAdEligibility(ad.listing);
  if (!eligibility.eligible) {
    return { error: eligibility.reason };
  }
  const remainingFromBase =
    eligibility.remainingDays === null
      ? null
      : Math.max(
          1,
          Math.ceil((ad.listing.endDate!.getTime() - base.getTime()) / (24 * 60 * 60 * 1000))
        );
  const { days: extraDays, notice } = capAdDays(parsed.data.extraDays, remainingFromBase);
  const extraCost = calculateAdTotal(ad.listing.type, ad.repeatEnabled, ad.targetMode, extraDays);

  const mpesaPhone = toMpesaPhone(String(formData.get("mpesaPhone") ?? user.phone ?? ""));
  if (!mpesaPhone) {
    return { fieldErrors: { mpesaPhone: ["Enter a valid Safaricom number, e.g. 0712345678."] } };
  }

  const stk = await initiateStkPush({
    phone: mpesaPhone,
    amount: extraCost,
    accountReference: "Extend ad",
    transactionDesc: "Extend ad",
  });
  if (!stk.ok) {
    return { error: stk.error };
  }

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      purpose: "AD_EXTEND",
      amount: extraCost,
      phone: mpesaPhone,
      payload: JSON.stringify({ adId: ad.id, extraDays }),
      merchantRequestId: stk.merchantRequestId,
      checkoutRequestId: stk.checkoutRequestId,
    },
  });

  return { pendingPayment: { paymentId: payment.id, amount: extraCost, phone: mpesaPhone }, notice };
}

export async function updateAdStatus(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = adStatusFormSchema.safeParse({
    adId: formData.get("adId"),
    status: formData.get("status"),
    adminNote: formData.get("adminNote") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data: {
    status: typeof parsed.data.status;
    startDate?: Date;
    endDate?: Date;
    adminNote?: string;
    expiryNotifiedAt?: null;
  } = {
    status: parsed.data.status,
    adminNote: parsed.data.adminNote,
  };
  if (parsed.data.status === "ACTIVE") {
    const existing = await prisma.ad.findUnique({ where: { id: parsed.data.adId } });
    data.startDate = new Date();
    // Runs for exactly as many days as were paid for -- not a flat 30.
    data.endDate = new Date(Date.now() + (existing?.days ?? 1) * 24 * 60 * 60 * 1000);
    data.expiryNotifiedAt = null;
  }

  const ad = await prisma.ad.update({
    where: { id: parsed.data.adId },
    data,
    include: { owner: true, listing: true },
  });

  if (parsed.data.status === "ACTIVE") {
    // Notify after responding to the admin -- email delivery is a
    // best-effort side effect and must never make approval hang.
    after(() =>
      sendMail(
        ad.owner.email,
        `Your ad for "${ad.productName ?? ad.listing.title}" is now live`,
        `<p>Hi ${ad.owner.name ?? ""},</p>
         <p>Thank you for advertising with us! Your ad for <strong>${ad.productName ?? ad.listing.title}</strong> has been approved and is now playing live on the site.</p>
         ${ad.adminNote ? `<p>Note from our team: ${ad.adminNote}</p>` : ""}
         <p>Thanks again for choosing us.</p>`
      )
    );
  }

  revalidatePath("/");
  return { success: true };
}

export async function getLiveAds(type?: ListingType, take = 5) {
  await Promise.all([cleanupExpiredAds(), notifyExpiringAds()]);
  const ads = await prisma.ad.findMany({
    where: {
      status: "ACTIVE",
      targetMode: "EVERYWHERE",
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      // Belt-and-suspenders: an ad's own paid window can outlive the
      // listing it promotes if that listing was later edited back to
      // PENDING/REJECTED (rather than deleted outright) -- only air ads for
      // listings that are still actually live.
      listing: { status: "ACTIVE", ...(type ? { type } : {}) },
    },
    include: { listing: true },
    orderBy: { startDate: "desc" },
    take: take * 3, // over-fetch since not all ACTIVE ads necessarily include a youtube video
  });

  return ads
    .map((ad) => ({ ad, media: parseAdMedia(ad.media) }))
    .filter(({ media }) => media.some((m) => m.type === "youtube"))
    .slice(0, take)
    .map(({ ad, media }) => ({
      ...ad,
      youtubeUrl: media.find((m) => m.type === "youtube")!.url,
    }));
}

export async function getTargetedAd(
  latitude: number,
  longitude: number,
  // Omitted for the tab-agnostic header slot, which matches on location
  // alone; MapSearch still passes the active tab's type to keep its
  // "Sponsored near here" card relevant to what's being browsed.
  type?: ListingType
) {
  const ads = await prisma.ad.findMany({
    where: {
      status: "ACTIVE",
      targetMode: "SELECT",
      targetLatitude: { not: null },
      targetLongitude: { not: null },
      targetRadiusKm: { not: null },
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      listing: { status: "ACTIVE", ...(type ? { type } : {}) },
    },
    include: { listing: true },
    orderBy: { startDate: "desc" },
    take: 50,
  });

  const match = ads
    .map((ad) => ({
      ad,
      media: parseAdMedia(ad.media),
      distanceKm: haversineDistanceKm(latitude, longitude, ad.targetLatitude!, ad.targetLongitude!),
    }))
    .filter(({ media, distanceKm, ad }) => distanceKm <= ad.targetRadiusKm! && media.some((m) => m.type === "youtube"))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  if (!match) return null;

  return {
    ...match.ad,
    youtubeUrl: match.media.find((m) => m.type === "youtube")!.url,
  };
}

export async function getPendingAdCount() {
  return prisma.ad.count({ where: { status: "PENDING" } });
}

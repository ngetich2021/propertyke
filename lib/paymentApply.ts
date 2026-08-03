import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { queryStkPush } from "@/lib/mpesa";
import { normalizeListingFields } from "@/lib/listingFields";
import type { Payment } from "@/app/generated/prisma/client";

// Deliberately NOT a "use server" module -- everything here is meant to run
// only from trusted server code (the M-Pesa callback route, and
// getPaymentStatus's active poll), never to be directly callable by a
// client. Both call sites converge here so a payment is only ever applied
// once, from one verified place.

// Re-verifies a payment's real status directly against M-Pesa -- the
// callback body itself is never trusted on its own, since Safaricom doesn't
// sign it, so both the webhook and active polling just use it as a prompt
// to check here. Safe to call repeatedly: a payment already resolved is a
// no-op.
export async function resolvePayment(checkoutRequestId: string, mpesaReceipt?: string): Promise<void> {
  const payment = await prisma.payment.findFirst({ where: { checkoutRequestId } });
  if (!payment || payment.status !== "PENDING") return;

  const result = await queryStkPush(checkoutRequestId);
  if (result.status === "PENDING") return;

  if (result.status === "FAILED") {
    await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "FAILED", resultDesc: result.reason },
    });
    return;
  }

  // updateMany + a PENDING guard makes this atomic against a concurrent
  // resolve (e.g. the callback and an active poll landing at the same
  // moment) -- only one of them will actually flip the row, so applyPayment
  // below only ever runs once. mpesaReceipt only ever arrives via the
  // callback's CallbackMetadata (see the callback route) -- a resolve
  // triggered by client polling alone leaves it unset.
  const { count } = await prisma.payment.updateMany({
    where: { id: payment.id, status: "PENDING" },
    data: { status: "SUCCESS", ...(mpesaReceipt ? { mpesaReceipt } : {}) },
  });
  if (count === 0) return;

  await applyPayment(payment.id);
}

async function applyPayment(paymentId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.appliedAt) return;

  const data = JSON.parse(payment.payload);

  switch (payment.purpose) {
    case "LISTING_CREATE":
      await applyListingCreate(payment, data);
      break;
    case "LISTING_EXTEND":
      await applyListingExtend(payment, data);
      break;
    case "AD_CREATE":
      await applyAdCreate(payment, data);
      break;
    case "AD_EXTEND":
      await applyAdExtend(payment, data);
      break;
  }

  await prisma.payment.update({ where: { id: payment.id }, data: { appliedAt: new Date() } });
  revalidatePath("/");
}

async function applyListingCreate(payment: Payment, data: Record<string, unknown>) {
  const type = data.type as "LAND" | "PROPERTY" | "RENTAL";
  await prisma.listing.create({
    data: {
      type,
      title: data.title as string,
      description: data.description as string,
      price: data.price as number,
      currency: (data.currency as string) ?? "KES",
      address: (data.address as string | undefined) ?? null,
      latitude: (data.latitude as number | undefined) ?? null,
      longitude: (data.longitude as number | undefined) ?? null,
      images: JSON.stringify((data.images as string[] | undefined) ?? []),
      days: data.days as number,
      ...normalizeListingFields(type, data as never),
      // The amount actually charged (see DEV_CHARGE_MULTIPLIER), not a
      // fresh recompute -- keeps this in sync with what M-Pesa collected.
      feeAmount: payment.amount,
      ownerId: payment.userId,
    },
  });
}

async function applyListingExtend(payment: Payment, data: { listingId: string; extraDays: number }) {
  const listing = await prisma.listing.findUnique({ where: { id: data.listingId } });
  if (!listing || listing.status !== "ACTIVE") return;

  const base = listing.endDate && listing.endDate > new Date() ? listing.endDate : new Date();
  const endDate = new Date(base.getTime() + data.extraDays * 24 * 60 * 60 * 1000);

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      endDate,
      days: listing.days + data.extraDays,
      feeAmount: (listing.feeAmount ?? 0) + payment.amount,
      expiryNotifiedAt: null,
    },
  });
}

async function applyAdCreate(payment: Payment, data: Record<string, unknown>) {
  const targetMode = data.targetMode as "EVERYWHERE" | "SELECT";
  await prisma.ad.create({
    data: {
      listingId: data.listingId as string,
      ownerId: payment.userId,
      amount: payment.amount,
      days: data.days as number,
      companyName: data.companyName as string,
      productName: data.productName as string,
      productDescription: data.productDescription as string,
      companyContact: data.companyContact as string,
      media: JSON.stringify(data.media ?? []),
      targetMode,
      targetLatitude: targetMode === "SELECT" ? ((data.targetLatitude as number) ?? null) : null,
      targetLongitude: targetMode === "SELECT" ? ((data.targetLongitude as number) ?? null) : null,
      targetRadiusKm: targetMode === "SELECT" ? ((data.targetRadiusKm as number) ?? null) : null,
      repeatEnabled: (data.repeatEnabled as boolean) ?? false,
      repeatCount: data.repeatEnabled ? ((data.repeatCount as number) ?? null) : null,
    },
  });
}

async function applyAdExtend(payment: Payment, data: { adId: string; extraDays: number }) {
  const ad = await prisma.ad.findUnique({ where: { id: data.adId } });
  if (!ad || (ad.status !== "ACTIVE" && ad.status !== "EXPIRED")) return;

  const base = ad.endDate && ad.endDate > new Date() ? ad.endDate : new Date();
  const endDate = new Date(base.getTime() + data.extraDays * 24 * 60 * 60 * 1000);

  await prisma.ad.update({
    where: { id: ad.id },
    data: {
      status: "ACTIVE",
      startDate: ad.startDate ?? new Date(),
      endDate,
      days: ad.days + data.extraDays,
      amount: ad.amount + payment.amount,
      expiryNotifiedAt: null,
    },
  });
}

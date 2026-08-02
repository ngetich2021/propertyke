"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { interestFormSchema, orderStatusFormSchema } from "@/lib/schemas";
import type { ActionState } from "@/lib/schemas";
import { sendMail } from "@/lib/mail";

export async function expressInterest(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = interestFormSchema.safeParse({
    listingId: formData.get("listingId"),
    amount: formData.get("amount"),
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: parsed.data.listingId },
    include: { owner: true },
  });
  if (!listing) {
    return { error: "This listing no longer exists." };
  }

  await prisma.order.create({
    data: {
      listingId: listing.id,
      buyerId: user.id,
      amount: parsed.data.amount,
      message: parsed.data.message,
    },
  });

  // Notify the owner after responding to the buyer -- email delivery is a
  // best-effort side effect and must never make "Make order" hang.
  after(() =>
    sendMail(
      listing.owner.email,
      `New interest in "${listing.title}"`,
      `<p>${user.name ?? user.email} is interested in your listing "${listing.title}".</p>
       ${parsed.data.message ? `<p>Message: ${parsed.data.message}</p>` : ""}`
    )
  );

  revalidatePath("/");
  return { success: true };
}

export async function updateOrderStatus(formData: FormData): Promise<void> {
  const user = await requireUser();

  const parsed = orderStatusFormSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    include: { listing: true },
  });
  if (!order) return;

  const canManage =
    order.buyerId === user.id ||
    order.listing.ownerId === user.id ||
    user.role === "ADMIN";
  if (!canManage) return;

  await prisma.order.update({
    where: { id: order.id },
    data: { status: parsed.data.status },
  });

  revalidatePath("/");
}

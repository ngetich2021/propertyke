"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { hasSectionAccess } from "@/lib/permissions";
import { interestFormSchema, orderStatusFormSchema } from "@/lib/schemas";
import type { ActionState } from "@/lib/schemas";
import { sendMail } from "@/lib/mail";
import { formatMoney } from "@/lib/format";
import type { OrderContactMethod } from "@/app/generated/prisma/client";

const CONTACT_METHOD_LABEL: Record<OrderContactMethod, string> = {
  CALL: "Phone call",
  SMS: "SMS / text",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
};

export async function expressInterest(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = interestFormSchema.safeParse({
    listingId: formData.get("listingId"),
    amount: formData.get("amount"),
    contactPhone: formData.get("contactPhone"),
    contactMethod: formData.get("contactMethod"),
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
      contactPhone: parsed.data.contactPhone,
      contactMethod: parsed.data.contactMethod,
    },
  });

  // Notify the owner after responding to the buyer -- email delivery is a
  // best-effort side effect and must never make "Make order" hang. Includes
  // the buyer's contact details up front so the owner can follow up without
  // having to log in first.
  after(() =>
    sendMail(
      listing.owner.email,
      `New order on "${listing.title}"`,
      `<p>${user.name ?? user.email} placed an order on your listing "${listing.title}".</p>
       <ul>
         <li>Offer amount: ${formatMoney(parsed.data.amount, listing.currency)}</li>
         <li>Buyer email: ${user.email}</li>
         <li>Buyer phone: ${parsed.data.contactPhone}</li>
         <li>Preferred contact method: ${CONTACT_METHOD_LABEL[parsed.data.contactMethod]}</li>
       </ul>
       ${parsed.data.message ? `<p>Message: ${parsed.data.message}</p>` : ""}
       <p>Log in to your account to review or update this order.</p>`
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
    hasSectionAccess(user, "orders");
  if (!canManage) return;

  await prisma.order.update({
    where: { id: order.id },
    data: { status: parsed.data.status },
  });

  revalidatePath("/");
}

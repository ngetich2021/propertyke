"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireSection } from "@/lib/dal";
import { hasSectionAccess } from "@/lib/permissions";
import { sendMail } from "@/lib/mail";
import { tourRequestFormSchema, tourStatusFormSchema } from "@/lib/schemas";
import type { ActionState } from "@/lib/schemas";

export async function requestTour(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = tourRequestFormSchema.safeParse({
    listingId: formData.get("listingId"),
    preferredDate: formData.get("preferredDate"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId }, include: { owner: true } });
  if (!listing) return { error: "This listing no longer exists." };

  await prisma.tourRequest.create({
    data: {
      listingId: listing.id,
      requesterId: user.id,
      preferredDate: new Date(parsed.data.preferredDate),
      notes: parsed.data.notes,
    },
  });

  after(() =>
    sendMail(
      listing.owner.email,
      `Site visit requested for "${listing.title}"`,
      `<p>${user.name ?? user.email} would like to view <strong>${listing.title}</strong>.</p>
       <ul>
         <li>Preferred date: ${new Date(parsed.data.preferredDate).toLocaleString()}</li>
         <li>Contact email: ${user.email}</li>
         ${parsed.data.notes ? `<li>Notes: ${parsed.data.notes}</li>` : ""}
       </ul>
       <p>Confirm or decline it from the Tours tab in your account.</p>`
    )
  );

  revalidatePath("/");
  return { success: true };
}

// Either the listing's own owner, or someone delegated the "tours" duty
// (see lib/permissions.ts), can confirm/decline a visit -- not just admins,
// since in practice it's the owner who actually knows their own availability.
export async function updateTourStatus(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = tourStatusFormSchema.safeParse({
    tourId: formData.get("tourId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const tour = await prisma.tourRequest.findUnique({
    where: { id: parsed.data.tourId },
    include: { listing: true },
  });
  if (!tour) return { error: "Tour request not found." };
  if (tour.listing.ownerId !== user.id && !hasSectionAccess(user, "tours")) {
    return { error: "Not authorized." };
  }

  await prisma.tourRequest.update({ where: { id: tour.id }, data: { status: parsed.data.status } });

  revalidatePath("/");
  return { success: true };
}

// requireSection gate for the admin "tours" panel itself lives in
// AdminSection.tsx -- this is just the data fetch.
export async function listAllTours() {
  await requireSection("tours");
  return prisma.tourRequest.findMany({
    include: { listing: true, requester: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

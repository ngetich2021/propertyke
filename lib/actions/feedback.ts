"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireSection } from "@/lib/dal";
import { feedbackFormSchema } from "@/lib/schemas";
import type { ActionState } from "@/lib/schemas";

export async function submitFeedback(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = feedbackFormSchema.safeParse({
    rating: formData.get("rating"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.feedback.create({
    data: { userId: user.id, rating: parsed.data.rating, message: parsed.data.message },
  });

  revalidatePath("/");
  return { success: true };
}

// A user's own past submissions -- shown under the feedback form so sending
// more doesn't feel like shouting into a void.
export async function getMyFeedback() {
  const user = await requireUser();
  return prisma.feedback.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

// requireSection gate for the admin "feedback" panel itself lives in
// AdminSection.tsx -- this is just the data fetch.
export async function listAllFeedback() {
  await requireSection("feedback");
  return prisma.feedback.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

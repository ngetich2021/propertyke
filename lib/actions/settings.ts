"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { profileFormSchema } from "@/lib/schemas";
import type { ActionState } from "@/lib/schemas";

export async function updateProfile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = profileFormSchema.safeParse({
    name: formData.get("name"),
    businessName: formData.get("businessName") || undefined,
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      businessName: parsed.data.businessName ?? null,
      phone: parsed.data.phone,
    },
  });

  revalidatePath("/");
  return { success: true };
}

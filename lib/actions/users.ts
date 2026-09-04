"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";
import { roleFormSchema, permissionsFormSchema } from "@/lib/schemas";
import type { ActionState } from "@/lib/schemas";

export async function updateRole(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = roleFormSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
  });

  revalidatePath("/");
  return { success: true };
}

// Only a full ADMIN may delegate duties -- see the `permissions` field on
// User and DELEGABLE_SECTIONS in lib/permissions.ts for why "roles" itself
// can never be granted this way.
export async function updatePermissions(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = permissionsFormSchema.safeParse({
    userId: formData.get("userId"),
    permissions: formData.getAll("permissions"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { permissions: JSON.stringify(parsed.data.permissions) },
  });

  revalidatePath("/");
  return { success: true };
}

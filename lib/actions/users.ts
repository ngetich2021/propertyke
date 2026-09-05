"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSection } from "@/lib/dal";
import { roleFormSchema, permissionsFormSchema, adminUpdateUserProfileFormSchema } from "@/lib/schemas";
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

// Lets anyone with the delegable "users" duty (or a full ADMIN) edit another
// user's profile fields from the Users panel -- same fields (and
// validation) as the user's own self-service profile form (see
// updateProfile in lib/actions/settings.ts), just targeting `userId`
// instead of the caller. Unlike role/duty changes, editing a name/phone
// isn't a privilege-escalation risk, so this doesn't need requireAdmin.
export async function updateUserProfileAsAdmin(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSection("users");

  const parsed = adminUpdateUserProfileFormSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    businessName: formData.get("businessName") || undefined,
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      name: parsed.data.name,
      businessName: parsed.data.businessName ?? null,
      phone: parsed.data.phone,
    },
  });

  revalidatePath("/");
  return { success: true };
}

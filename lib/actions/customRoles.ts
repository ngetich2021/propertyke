"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";
import {
  createRoleFormSchema,
  updateRoleFormSchema,
  deleteRoleFormSchema,
  assignCustomRoleFormSchema,
} from "@/lib/schemas";
import type { ActionState } from "@/lib/schemas";

// Named-role management is admin-only, same as ad-hoc per-user delegation
// (see updatePermissions in lib/actions/users.ts) -- creating or editing a
// role's duty set is itself a way to grant access, so it can't be delegated.

export async function createCustomRole(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = createRoleFormSchema.safeParse({
    name: formData.get("name"),
    permissions: formData.getAll("permissions"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const existing = await prisma.role.findUnique({ where: { name: parsed.data.name } });
  if (existing) return { error: "A role with that name already exists." };

  await prisma.role.create({
    data: { name: parsed.data.name, permissions: JSON.stringify(parsed.data.permissions) },
  });

  revalidatePath("/");
  return { success: true };
}

export async function updateCustomRole(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = updateRoleFormSchema.safeParse({
    roleId: formData.get("roleId"),
    name: formData.get("name"),
    permissions: formData.getAll("permissions"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const clash = await prisma.role.findFirst({
    where: { name: parsed.data.name, NOT: { id: parsed.data.roleId } },
  });
  if (clash) return { error: "A role with that name already exists." };

  await prisma.role.update({
    where: { id: parsed.data.roleId },
    data: { name: parsed.data.name, permissions: JSON.stringify(parsed.data.permissions) },
  });

  revalidatePath("/");
  return { success: true };
}

export async function deleteCustomRole(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = deleteRoleFormSchema.safeParse({ roleId: formData.get("roleId") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  // Assigned users' roleId is cleared automatically (onDelete: SetNull, see
  // schema.prisma) -- they fall back to their own ad-hoc permissions rather
  // than being silently locked out.
  await prisma.role.delete({ where: { id: parsed.data.roleId } });

  revalidatePath("/");
  return { success: true };
}

export async function assignCustomRole(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = assignCustomRoleFormSchema.safeParse({
    userId: formData.get("userId"),
    roleId: formData.get("roleId") || undefined,
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { roleId: parsed.data.roleId ?? null },
  });

  revalidatePath("/");
  return { success: true };
}

"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";
import { sendMail } from "@/lib/mail";
import { inviteStaffFormSchema, revokeStaffInviteFormSchema } from "@/lib/schemas";
import type { ActionState } from "@/lib/schemas";

// Admin-only, same as updateRole/updatePermissions/createCustomRole -- see
// StaffInvite in schema.prisma and lib/invites.ts for how this gets applied
// once the invited email actually signs in.
export async function inviteStaff(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = inviteStaffFormSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    roleId: formData.get("roleId") || undefined,
    permissions: formData.getAll("permissions"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser?.role === "ADMIN") {
    return { error: "That person is already an admin." };
  }

  const existingInvite = await prisma.staffInvite.findFirst({
    where: { email: parsed.data.email, status: "PENDING" },
  });
  if (existingInvite) return { error: "There's already a pending invite for that email." };

  await prisma.staffInvite.create({
    data: {
      email: parsed.data.email,
      invitedById: admin.id,
      role: parsed.data.role,
      roleId: parsed.data.roleId || null,
      permissions: JSON.stringify(parsed.data.permissions),
      token: randomBytes(32).toString("hex"),
    },
  });

  const appUrl = (process.env.APP_URL ?? "").replace(/\/+$/, "");
  await sendMail(
    parsed.data.email,
    "You've been invited to join the EstateFinderHub team",
    `<p>Hi,</p>
     <p>${admin.name ?? "An admin"} has invited you to help run EstateFinderHub${
       parsed.data.role === "ADMIN" ? " as an admin" : ""
     }.</p>
     <p>Sign in with Google using <strong>${parsed.data.email}</strong>${appUrl ? ` at <a href="${appUrl}">${appUrl}</a>` : ""} to activate your access -- no separate signup needed.</p>`
  );

  revalidatePath("/");
  return { success: true };
}

export async function revokeStaffInvite(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = revokeStaffInviteFormSchema.safeParse({ inviteId: formData.get("inviteId") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.staffInvite.update({
    where: { id: parsed.data.inviteId },
    data: { status: "REVOKED", revokedAt: new Date() },
  });

  revalidatePath("/");
  return { success: true };
}

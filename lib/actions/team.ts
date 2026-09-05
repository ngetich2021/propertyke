"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { sendMail } from "@/lib/mail";
import {
  inviteTeamMemberFormSchema,
  revokeTeamInviteFormSchema,
  updateTeamMemberScopesFormSchema,
  removeTeamMemberFormSchema,
} from "@/lib/schemas";
import type { ActionState } from "@/lib/schemas";
import { OWNER_DUTIES } from "@/lib/ownerDuties";

// Any signed-in account can build its own "Team" -- entirely separate from
// the admin StaffInvite system (lib/actions/invites.ts). ownerId is always
// the caller's own id: you can only invite people onto YOUR OWN account,
// never someone else's, even if you yourself are a delegated manager for a
// third account (no sub-delegating what was delegated to you).
export async function inviteTeamMember(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const owner = await requireUser();

  const parsed = inviteTeamMemberFormSchema.safeParse({
    email: formData.get("email"),
    scopes: formData.getAll("scopes"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  if (parsed.data.email === owner.email?.toLowerCase()) {
    return { error: "You can't invite yourself." };
  }

  const existingDelegation = await prisma.ownerDelegation.findFirst({
    where: { ownerId: owner.id, manager: { email: parsed.data.email } },
  });
  if (existingDelegation) return { error: "That person is already on your team." };

  const existingInvite = await prisma.ownerInvite.findFirst({
    where: { ownerId: owner.id, email: parsed.data.email, status: "PENDING" },
  });
  if (existingInvite) return { error: "There's already a pending invite for that email." };

  await prisma.ownerInvite.create({
    data: {
      email: parsed.data.email,
      ownerId: owner.id,
      scopes: JSON.stringify(parsed.data.scopes),
      token: randomBytes(32).toString("hex"),
    },
  });

  const dutyLabels = OWNER_DUTIES.filter((d) => parsed.data.scopes.includes(d.key))
    .map((d) => d.label)
    .join(", ");
  const appUrl = (process.env.APP_URL ?? "").replace(/\/+$/, "");
  await sendMail(
    parsed.data.email,
    `${owner.name ?? "Someone"} invited you to help manage their PropertyKE account`,
    `<p>Hi,</p>
     <p>${owner.name ?? "A PropertyKE user"} has invited you to help manage: <strong>${dutyLabels}</strong>.</p>
     <p>Sign in with Google using <strong>${parsed.data.email}</strong>${appUrl ? ` at <a href="${appUrl}">${appUrl}</a>` : ""} to activate -- no separate signup needed. You'll keep your own account; this just adds their listings alongside yours wherever it's relevant.</p>`
  );

  revalidatePath("/");
  return { success: true };
}

export async function revokeTeamInvite(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const owner = await requireUser();

  const parsed = revokeTeamInviteFormSchema.safeParse({ inviteId: formData.get("inviteId") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const invite = await prisma.ownerInvite.findUnique({ where: { id: parsed.data.inviteId } });
  if (!invite || invite.ownerId !== owner.id) return { error: "Invite not found." };

  await prisma.ownerInvite.update({
    where: { id: invite.id },
    data: { status: "REVOKED", revokedAt: new Date() },
  });

  revalidatePath("/");
  return { success: true };
}

export async function updateTeamMemberScopes(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const owner = await requireUser();

  const parsed = updateTeamMemberScopesFormSchema.safeParse({
    delegationId: formData.get("delegationId"),
    scopes: formData.getAll("scopes"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const delegation = await prisma.ownerDelegation.findUnique({ where: { id: parsed.data.delegationId } });
  if (!delegation || delegation.ownerId !== owner.id) return { error: "Team member not found." };

  await prisma.ownerDelegation.update({
    where: { id: delegation.id },
    data: { scopes: JSON.stringify(parsed.data.scopes) },
  });

  revalidatePath("/");
  return { success: true };
}

export async function removeTeamMember(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const owner = await requireUser();

  const parsed = removeTeamMemberFormSchema.safeParse({ delegationId: formData.get("delegationId") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const delegation = await prisma.ownerDelegation.findUnique({ where: { id: parsed.data.delegationId } });
  if (!delegation || delegation.ownerId !== owner.id) return { error: "Team member not found." };

  await prisma.ownerDelegation.delete({ where: { id: delegation.id } });

  revalidatePath("/");
  return { success: true };
}

// This account's own team: who's been invited (still pending) and who's
// already accepted (an OwnerDelegation) -- rendered by TeamSection.
export async function getMyTeam() {
  const owner = await requireUser();
  const [invites, delegations] = await Promise.all([
    prisma.ownerInvite.findMany({
      where: { ownerId: owner.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.ownerDelegation.findMany({
      where: { ownerId: owner.id },
      include: { manager: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { invites, delegations };
}

// The other accounts this user has been delegated onto -- shown as a
// read-only "you help manage" list; the actual merged listings/ads/orders
// views are what let them do anything with it (see lib/ownerAccess.ts).
export async function getMyManagedAccounts() {
  const manager = await requireUser();
  return prisma.ownerDelegation.findMany({
    where: { managerId: manager.id },
    include: { owner: { select: { id: true, name: true, email: true, businessName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

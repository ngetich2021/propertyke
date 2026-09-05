import "server-only";
import { prisma } from "@/lib/prisma";

// Wired from the `signIn` event in lib/auth.ts, which fires on every
// completed sign-in -- brand new account or returning one. There is no
// separate "click a link to accept" step: since Google is the only sign-in
// method and its email is already verified, a pending invite is honored the
// moment that exact email successfully authenticates, whether or not the
// invite's own email actually gets read. Both invite systems are otherwise
// completely independent (see StaffInvite / OwnerInvite in schema.prisma).
export async function acceptPendingInvites(userId: string, email: string): Promise<void> {
  // SQLite has no case-insensitive collation Prisma can filter with, so
  // every invite is stored lowercased at creation time (see
  // lib/actions/invites.ts, lib/actions/team.ts) and matched the same way
  // here, rather than relying on an unsupported `mode: "insensitive"`.
  const normalized = email.toLowerCase();
  await Promise.all([acceptStaffInvite(userId, normalized), acceptOwnerInvites(userId, normalized)]);
}

async function acceptStaffInvite(userId: string, email: string): Promise<void> {
  const invite = await prisma.staffInvite.findFirst({
    where: { email, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (!invite) return;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { role: invite.role, roleId: invite.roleId, permissions: invite.permissions },
    }),
    prisma.staffInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    }),
  ]);
}

// A user can be invited onto multiple different owners' teams -- accept
// every pending one, not just the most recent.
async function acceptOwnerInvites(userId: string, email: string): Promise<void> {
  const invites = await prisma.ownerInvite.findMany({
    where: { email, status: "PENDING" },
  });
  if (invites.length === 0) return;

  for (const invite of invites) {
    // Inviting yourself (or re-inviting someone already on the team) isn't
    // an error -- just settle the invite without a meaningless self-grant
    // or a duplicate-key crash on the upsert below.
    if (invite.ownerId === userId) {
      await prisma.ownerInvite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      });
      continue;
    }

    await prisma.$transaction([
      prisma.ownerDelegation.upsert({
        where: { ownerId_managerId: { ownerId: invite.ownerId, managerId: userId } },
        create: { ownerId: invite.ownerId, managerId: userId, scopes: invite.scopes },
        update: { scopes: invite.scopes },
      }),
      prisma.ownerInvite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      }),
    ]);
  }
}

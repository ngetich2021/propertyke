import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { acceptPendingInvites } from "@/lib/invites";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  session: { strategy: "database" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role;
      session.user.phone = user.phone;
      session.user.businessName = user.businessName;
      session.user.verifiedUntil = user.verifiedUntil;
      session.user.permissions = user.permissions;
      // The adapter only loads scalar User columns, so a named custom role
      // (see roleId, lib/permissions.ts) needs its own lookup here -- this
      // is what every hasSectionAccess/getAccessibleSections check downstream
      // relies on to see the role's duties instead of just `permissions`.
      session.user.customRole = user.roleId
        ? await prisma.role.findUnique({ where: { id: user.roleId }, select: { permissions: true } })
        : null;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // The very first account ever created on this deployment becomes the admin.
      const userCount = await prisma.user.count();
      if (userCount === 1 && user.id) {
        await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      }
    },
    // Fires on every completed sign-in, new account or returning -- honors
    // any pending StaffInvite/OwnerInvite for this exact (Google-verified)
    // email. See lib/invites.ts for why there's no separate "click a link"
    // acceptance step.
    async signIn({ user }) {
      if (user.id && user.email) {
        await acceptPendingInvites(user.id, user.email);
      }
    },
  },
});

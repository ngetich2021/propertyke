import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  session: { strategy: "database" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role;
      session.user.phone = user.phone;
      session.user.businessName = user.businessName;
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
  },
});

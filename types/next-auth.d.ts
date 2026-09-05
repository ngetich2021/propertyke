import { UserRole } from "@/app/generated/prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      phone: string | null;
      businessName: string | null;
      verifiedUntil: Date | null;
      permissions: string;
      customRole: { permissions: string } | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    role: UserRole;
    phone: string | null;
    businessName: string | null;
    verifiedUntil: Date | null;
    permissions: string;
    roleId: string | null;
  }
}

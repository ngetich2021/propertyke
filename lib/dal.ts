import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasSectionAccess } from "@/lib/permissions";
import type { AdminSectionKey } from "@/lib/nav";

export const getSession = cache(async () => {
  return auth();
});

export const requireUser = cache(async () => {
  const session = await getSession();
  if (!session?.user) {
    redirect("/?auth=required");
  }
  return session.user;
});

export const requireAdmin = cache(async () => {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    redirect("/?tab=lands");
  }
  return user;
});

// Like requireAdmin, but also lets in a regular USER who's been delegated
// this specific duty (see lib/permissions.ts) -- used to gate each admin
// section individually instead of the whole admin area at once.
export const requireSection = cache(async (section: AdminSectionKey) => {
  const user = await requireUser();
  if (!hasSectionAccess(user, section)) {
    redirect("/?tab=lands");
  }
  return user;
});

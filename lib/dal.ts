import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

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

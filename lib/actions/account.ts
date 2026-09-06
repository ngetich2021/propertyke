"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { signOut } from "@/lib/auth";
import type { ActionState } from "@/lib/schemas";

const CONFIRM_PHRASE = "DELETE";

// Every relation on User (Listing, Ad, Order, Payment, SupportTicket, etc.)
// is declared onDelete: Cascade in schema.prisma, so this one call removes
// the account and everything tied to it -- listings, ads, orders placed on
// them, M-Pesa payment records, and support history. There's no soft-delete
// or anonymized remnant left behind (see the Privacy Policy's retention
// section, which describes exactly this).
export async function deleteAccount(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  if (formData.get("confirm") !== CONFIRM_PHRASE) {
    return { fieldErrors: { confirm: [`Type ${CONFIRM_PHRASE} to confirm.`] } };
  }

  if (user.role === "ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", id: { not: user.id } },
    });
    if (otherAdmins === 0) {
      return {
        error:
          "You're the only admin account. Promote another user to admin (Admin > Users) before deleting this account, or the platform will have no admin left.",
      };
    }
  }

  await prisma.user.delete({ where: { id: user.id } });

  // Throws a redirect internally -- deliberately not caught, so it
  // propagates and takes the browser to "/" signed out.
  await signOut({ redirectTo: "/" });
  return {};
}

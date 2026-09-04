import "server-only";
import { prisma } from "@/lib/prisma";
import { toMpesaPhone } from "@/lib/mpesa";

export type SupportContact = {
  name: string;
  whatsappUrl: string | null;
  phone: string | null;
  email: string | null;
};

const WHATSAPP_GREETING = "Hi PropertyKE, I need some help.";

// The customer-support contact shown across the app (see SupportButton) is
// whoever the platform's original admin is -- the same account lib/auth.ts
// auto-promotes on first sign-up -- rather than a hardcoded number, so it
// stays correct if that account's phone/email ever changes and needs no
// separate config. Falls back gracefully (no WhatsApp link, etc.) if that
// admin hasn't filled in a phone/business name yet.
export async function getSupportContact(): Promise<SupportContact> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { name: true, businessName: true, phone: true, email: true },
  });

  // Same MSISDN normalization the M-Pesa STK push uses -- a WhatsApp deep
  // link needs the same 2547XXXXXXXX digits-only format.
  const msisdn = admin?.phone ? toMpesaPhone(admin.phone) : null;

  return {
    name: admin?.businessName ?? admin?.name ?? "PropertyKE support",
    whatsappUrl: msisdn ? `https://wa.me/${msisdn}?text=${encodeURIComponent(WHATSAPP_GREETING)}` : null,
    phone: admin?.phone ?? null,
    email: admin?.email ?? null,
  };
}

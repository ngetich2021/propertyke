"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { verificationFormSchema } from "@/lib/schemas";
import type { ActionState } from "@/lib/schemas";
import { calculateVerificationFee } from "@/lib/verificationPricing";
import { toMpesaPhone, initiateStkPush } from "@/lib/mpesa";

// Sends the M-Pesa prompt for a verification badge (KES/day, paid upfront
// for however many days) -- the badge itself is only granted once that
// payment resolves to SUCCESS (see applyVerification in lib/paymentApply.ts).
export async function initiateVerificationPayment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = verificationFormSchema.safeParse({
    days: formData.get("days"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const mpesaPhone = toMpesaPhone(String(formData.get("mpesaPhone") ?? user.phone ?? ""));
  if (!mpesaPhone) {
    return { fieldErrors: { mpesaPhone: ["Enter a valid Safaricom number, e.g. 0712345678."] } };
  }

  const fee = calculateVerificationFee(parsed.data.days);

  const stk = await initiateStkPush({
    phone: mpesaPhone,
    amount: fee,
    accountReference: "Verification",
    transactionDesc: "Verification",
  });
  if (!stk.ok) {
    return { error: stk.error };
  }

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      purpose: "VERIFICATION",
      amount: fee,
      phone: mpesaPhone,
      payload: JSON.stringify({ days: parsed.data.days }),
      merchantRequestId: stk.merchantRequestId,
      checkoutRequestId: stk.checkoutRequestId,
    },
  });

  return { pendingPayment: { paymentId: payment.id, amount: fee, phone: mpesaPhone } };
}

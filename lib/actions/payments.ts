"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { resolvePayment } from "@/lib/paymentApply";

export type PaymentStatusResult =
  | { status: "PENDING" }
  | { status: "SUCCESS" }
  | { status: "FAILED"; reason: string }
  | { status: "NOT_FOUND" };

// Polled by the client while an M-Pesa prompt is out. Re-checks with
// Safaricom directly (via resolvePayment) rather than only reading whatever
// the callback last wrote, so payment confirmation still works even if the
// callback URL never gets hit.
export async function getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
  const user = await requireUser();

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.userId !== user.id) {
    return { status: "NOT_FOUND" };
  }

  if (payment.status === "PENDING" && payment.checkoutRequestId) {
    await resolvePayment(payment.checkoutRequestId);
    const refreshed = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (refreshed) {
      if (refreshed.status === "SUCCESS") return { status: "SUCCESS" };
      if (refreshed.status === "FAILED") {
        return { status: "FAILED", reason: refreshed.resultDesc ?? "The payment was not completed." };
      }
    }
    return { status: "PENDING" };
  }

  if (payment.status === "SUCCESS") return { status: "SUCCESS" };
  if (payment.status === "FAILED") {
    return { status: "FAILED", reason: payment.resultDesc ?? "The payment was not completed." };
  }
  return { status: "PENDING" };
}

import { NextRequest, NextResponse } from "next/server";
import { resolvePayment } from "@/lib/paymentApply";

// Safaricom posts here after an STK push resolves. The body isn't signed, so
// it's only ever used as a prompt to look the payment up and re-verify its
// real status directly with M-Pesa (see resolvePayment) -- never trusted on
// its own. Always answers 200 so Daraja doesn't retry a delivery we've
// already handled (or don't recognize).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[mpesa] callback body:", JSON.stringify(body));
    const checkoutRequestId = body?.Body?.stkCallback?.CheckoutRequestID;
    if (typeof checkoutRequestId === "string") {
      const items = body?.Body?.stkCallback?.CallbackMetadata?.Item as
        | Array<{ Name: string; Value: unknown }>
        | undefined;
      const receipt = items?.find((item) => item.Name === "MpesaReceiptNumber")?.Value;
      await resolvePayment(checkoutRequestId, typeof receipt === "string" ? receipt : undefined);
    }
  } catch (error) {
    console.error("M-Pesa callback failed", error);
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}

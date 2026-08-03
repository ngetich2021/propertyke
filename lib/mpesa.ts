import "server-only";

const BASE_URL =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

// Accepts whatever a Kenyan user is likely to type -- 0712345678,
// +254712345678, 254712345678, or 712345678 -- and normalizes to the
// 2547XXXXXXXX / 2541XXXXXXXX MSISDN format Daraja requires. Returns null
// for anything that isn't a plausible Safaricom-range mobile number.
export function toMpesaPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

async function getAccessToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("M-Pesa is not configured on this server.");

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Could not authenticate with M-Pesa.");
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    String(now.getFullYear()) +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

function password(ts: string): string {
  const shortcode = process.env.MPESA_SHORTCODE ?? "";
  const passkey = process.env.MPESA_PASSKEY ?? "";
  return Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");
}

export type StkPushResult =
  | { ok: true; merchantRequestId: string; checkoutRequestId: string }
  | { ok: false; error: string };

// Sends the "enter your PIN" prompt to the customer's phone. Resolving here
// only means the prompt was sent -- it says nothing about whether they
// actually paid; see queryStkPush / lib/paymentApply.ts for that.
export async function initiateStkPush(params: {
  phone: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}): Promise<StkPushResult> {
  try {
    const token = await getAccessToken();
    const ts = timestamp();
    const shortcode = process.env.MPESA_SHORTCODE ?? "";
    // This account collects funds via a Till (Buy Goods), not a Paybill --
    // using CustomerPayBillOnline against a till number is a real
    // organization/transaction-type mismatch and Safaricom rejects it with
    // an unhelpful generic result ("Failed due to an unresolved reason
    // type.") rather than a clear error, which is what sent this to a human
    // to debug in the first place.
    const tillNumber = process.env.MPESA_TILL_NUMBER || shortcode;
    const callbackBase = (process.env.MPESA_CALLBACK_URL ?? "").replace(/\/+$/, "");

    const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password(ts),
        Timestamp: ts,
        TransactionType: "CustomerBuyGoodsOnline",
        Amount: Math.max(1, Math.round(params.amount)),
        PartyA: params.phone,
        PartyB: tillNumber,
        PhoneNumber: params.phone,
        CallBackURL: `${callbackBase}/api/mpesa/callback`,
        // Daraja hard-limits these to 12 / 13 characters respectively.
        AccountReference: params.accountReference.slice(0, 12),
        TransactionDesc: params.transactionDesc.slice(0, 13),
      }),
      cache: "no-store",
    });

    const data = await res.json();
    console.log("[mpesa] STK push request:", {
      TransactionType: "CustomerBuyGoodsOnline",
      BusinessShortCode: shortcode,
      PartyB: tillNumber,
      Amount: Math.max(1, Math.round(params.amount)),
    });
    console.log("[mpesa] STK push response:", data);
    if (!res.ok || data.ResponseCode !== "0") {
      return {
        ok: false,
        error: data.errorMessage || data.ResponseDescription || "M-Pesa declined the payment request.",
      };
    }
    return { ok: true, merchantRequestId: data.MerchantRequestID, checkoutRequestId: data.CheckoutRequestID };
  } catch (err) {
    console.error("[mpesa] STK push threw:", err);
    return { ok: false, error: "Could not reach M-Pesa. Please try again in a moment." };
  }
}

export type StkQueryResult =
  | { status: "SUCCESS" }
  | { status: "FAILED"; reason: string }
  | { status: "PENDING" };

// Safaricom's own ResultDesc for a given code is often either terse jargon
// or -- for some rejection types -- unhelpfully generic ("Failed due to an
// unresolved reason type."). Translate the well-known ones; anything else
// falls back to whatever Safaricom actually said.
const RESULT_CODE_MESSAGE: Record<string, string> = {
  "1": "The M-Pesa account doesn't have enough funds for this payment.",
  "1032": "The payment prompt was cancelled.",
  "1037": "The payment prompt timed out before a PIN was entered.",
  "2001": "The PIN entered was incorrect.",
};

// Asks Safaricom directly whether a given STK push actually completed --
// the source of truth used both by the callback route and by active polling
// from the client, since the callback itself isn't signed and can't be
// trusted on its own.
export async function queryStkPush(checkoutRequestId: string): Promise<StkQueryResult> {
  try {
    const token = await getAccessToken();
    const ts = timestamp();
    const shortcode = process.env.MPESA_SHORTCODE ?? "";

    const res = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password(ts),
        Timestamp: ts,
        CheckoutRequestID: checkoutRequestId,
      }),
      cache: "no-store",
    });

    const data = await res.json();
    // Logged at full detail on purpose -- Safaricom's ResultDesc for some
    // rejection types (e.g. a till not fully enabled for STK/API-initiated
    // Buy Goods payments) is generic ("Failed due to an unresolved reason
    // type.") and unhelpful on its own. The raw ResultCode/errorCode here is
    // what actually identifies the real cause -- check this log against
    // Daraja's result-code reference, or your till's API settings, if
    // payments keep failing after a real STK prompt was received.
    console.log("[mpesa] STK query response:", data);

    // While Safaricom is still processing the push, the query endpoint
    // responds with this error envelope instead of a ResultCode.
    if (data.errorCode === "500.001.1001") {
      return { status: "PENDING" };
    }
    if (String(data.ResultCode) === "0") {
      return { status: "SUCCESS" };
    }
    if (data.ResultCode !== undefined) {
      const code = String(data.ResultCode);
      const reason = RESULT_CODE_MESSAGE[code] || data.ResultDesc || "The payment was not completed.";
      return { status: "FAILED", reason: `${reason} (code ${code})` };
    }
    return { status: "PENDING" };
  } catch (err) {
    console.error("[mpesa] STK query threw:", err);
    // A network hiccup talking to Safaricom isn't the same as the payment
    // having failed -- leave it pending so the next poll can try again.
    return { status: "PENDING" };
  }
}

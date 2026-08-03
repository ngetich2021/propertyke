"use client";

import { useActionState, useId, useState } from "react";
import { initiateExtendAdPayment } from "@/lib/actions/ads";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError } from "@/components/ui/FieldError";
import { MpesaPaymentGate } from "@/components/ui/MpesaPaymentGate";
import { calculateAdDailyRate } from "@/lib/adPricing";
import { formatMoney } from "@/lib/format";
import { sanitizePhoneInput } from "@/lib/phone";
import type { ActionState } from "@/lib/schemas";
import type { Ad, ListingType } from "@/app/generated/prisma/client";

// Owner-facing self-service extension: pay for more days without going
// back through admin re-review -- see initiateExtendAdPayment.
export function ExtendAdForm({
  ad,
  listingType,
  currency,
}: {
  ad: Ad;
  listingType: ListingType;
  currency: string;
}) {
  // Dismissing a failed/cancelled payment attempt hides `state.pendingPayment`
  // again without needing a mirrored copy of it in local state -- reset
  // right as a fresh submission goes out so the next attempt's prompt shows.
  const [dismissed, setDismissed] = useState(false);
  async function submit(prevState: ActionState, formData: FormData) {
    setDismissed(false);
    return initiateExtendAdPayment(prevState, formData);
  }
  const id = useId();
  const [state, action] = useActionState(submit, undefined);
  const payment = !dismissed ? state?.pendingPayment : undefined;
  const [extraDays, setExtraDays] = useState("1");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const days = Math.max(1, Math.trunc(Number(extraDays)) || 1);
  const dailyRate = calculateAdDailyRate(listingType, ad.repeatEnabled, ad.targetMode);
  const cost = dailyRate * days;

  if (payment) {
    return (
      <MpesaPaymentGate
        paymentId={payment.paymentId}
        phone={payment.phone}
        amount={payment.amount}
        successMessage="The ad has been extended."
        onDone={() => setDismissed(true)}
      />
    );
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800"
    >
      <input type="hidden" name="adId" value={ad.id} />
      <p className="text-xs font-medium">Pay to keep this ad running longer</p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${id}-extraDays`} className="sr-only">
          Extra days
        </label>
        <input
          id={`${id}-extraDays`}
          name="extraDays"
          type="number"
          min={1}
          max={365}
          value={extraDays}
          onChange={(e) => setExtraDays(e.target.value)}
          className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="text-xs text-zinc-500">extra days = {formatMoney(cost, currency)}</span>
      </div>
      <FieldError messages={state?.fieldErrors?.extraDays} />
      <label htmlFor={`${id}-mpesaPhone`} className="sr-only">
        M-Pesa phone number
      </label>
      <input
        id={`${id}-mpesaPhone`}
        name="mpesaPhone"
        type="tel"
        value={mpesaPhone}
        onChange={(e) => setMpesaPhone(sanitizePhoneInput(e.target.value))}
        placeholder="M-Pesa phone, e.g. 0712345678"
        required
        className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <FieldError messages={state?.fieldErrors?.mpesaPhone} />
      <SubmitButton
        pendingLabel="Sending M-Pesa prompt…"
        className="w-fit rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Pay & extend
      </SubmitButton>
      {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
    </form>
  );
}

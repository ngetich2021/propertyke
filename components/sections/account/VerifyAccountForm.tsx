"use client";

import { useActionState, useId, useState } from "react";
import { initiateVerificationPayment } from "@/lib/actions/verification";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError } from "@/components/ui/FieldError";
import { MpesaPaymentGate } from "@/components/ui/MpesaPaymentGate";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { calculateVerificationFee } from "@/lib/verificationPricing";
import { formatMoney } from "@/lib/format";
import { sanitizePhoneInput } from "@/lib/phone";
import type { ActionState } from "@/lib/schemas";

// Self-serve paid "verified" badge -- KES/day, paid upfront for however
// many days via M-Pesa (see lib/verificationPricing.ts,
// lib/actions/verification.ts). Stacks on top of any time already
// remaining if renewed before it lapses.
export function VerifyAccountForm({
  verifiedUntil,
  defaultMpesaPhone,
}: {
  verifiedUntil?: Date | null;
  defaultMpesaPhone?: string | null;
}) {
  const id = useId();
  // Dismissing a failed/cancelled payment attempt hides `state.pendingPayment`
  // again without needing a mirrored copy of it in local state -- reset
  // right as a fresh submission goes out so the next attempt's prompt shows.
  const [dismissed, setDismissed] = useState(false);
  async function submit(prevState: ActionState, formData: FormData) {
    setDismissed(false);
    return initiateVerificationPayment(prevState, formData);
  }
  const [state, action] = useActionState(submit, undefined);
  const payment = !dismissed ? state?.pendingPayment : undefined;
  const [days, setDays] = useState("30");
  const [mpesaPhone, setMpesaPhone] = useState(defaultMpesaPhone ?? "");
  const daysNum = Math.max(1, Math.trunc(Number(days)) || 1);
  const fee = calculateVerificationFee(daysNum);
  const isVerified = !!verifiedUntil && verifiedUntil > new Date();

  if (payment) {
    return (
      <MpesaPaymentGate
        paymentId={payment.paymentId}
        phone={payment.phone}
        amount={payment.amount}
        successMessage="Your account is verified."
        onDone={() => setDismissed(true)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-sm">
        {isVerified ? (
          <>
            <VerifiedBadge verifiedUntil={verifiedUntil} /> Verified until{" "}
            {verifiedUntil!.toLocaleDateString()}
          </>
        ) : (
          <span className="text-zinc-500">Not verified.</span>
        )}
      </p>
      <form action={action} className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor={`${id}-days`} className="sr-only">
          Days
        </label>
        <input
          id={`${id}-days`}
          name="days"
          type="number"
          min={1}
          max={365}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="text-xs text-zinc-500">days = {formatMoney(fee)}</span>
        <FieldError messages={state?.fieldErrors?.days} />
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
          className="w-full max-w-xs rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        <FieldError messages={state?.fieldErrors?.mpesaPhone} />
        <SubmitButton
          pendingLabel="Sending M-Pesa prompt…"
          className="w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {isVerified ? "Extend verification" : "Get verified"}
        </SubmitButton>
      </form>
      {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
    </div>
  );
}

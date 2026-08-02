"use client";

import { useActionState, useState } from "react";
import { extendAd } from "@/lib/actions/ads";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError } from "@/components/ui/FieldError";
import { calculateAdDailyRate } from "@/lib/adPricing";
import { formatMoney } from "@/lib/format";
import type { Ad, ListingType } from "@/app/generated/prisma/client";

// Owner-facing self-service extension: pay for more days without going
// back through admin re-review -- see extendAd.
export function ExtendAdForm({
  ad,
  listingType,
  currency,
}: {
  ad: Ad;
  listingType: ListingType;
  currency: string;
}) {
  const [state, action] = useActionState(extendAd, undefined);
  const [extraDays, setExtraDays] = useState("1");
  const days = Math.max(1, Math.trunc(Number(extraDays)) || 1);
  const dailyRate = calculateAdDailyRate(listingType, ad.repeatEnabled, ad.targetMode);
  const cost = dailyRate * days;

  return (
    <form
      action={action}
      className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800"
    >
      <input type="hidden" name="adId" value={ad.id} />
      <p className="text-xs font-medium">Pay to keep this ad running longer</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="extraDays"
          type="number"
          min={1}
          max={365}
          value={extraDays}
          onChange={(e) => setExtraDays(e.target.value)}
          className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="text-xs text-zinc-500">extra days = {formatMoney(cost, currency)}</span>
        <SubmitButton
          pendingLabel="…"
          className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Extend
        </SubmitButton>
      </div>
      <FieldError messages={state?.fieldErrors?.extraDays} />
      {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
      {state?.success && <p className="text-xs text-green-600 dark:text-green-400">Extended.</p>}
      {state?.notice && <p className="text-xs text-amber-600 dark:text-amber-400">{state.notice}</p>}
    </form>
  );
}

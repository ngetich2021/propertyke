"use client";

import { useActionState, useState } from "react";
import { extendListing } from "@/lib/actions/listings";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError } from "@/components/ui/FieldError";
import { LISTING_DAILY_RATE } from "@/lib/listingPricing";
import { formatMoney } from "@/lib/format";
import type { ListingType } from "@/app/generated/prisma/client";

// Owner-facing self-service extension: pay for more days without going
// back through admin re-review (nothing about the listing changed, just
// how long it stays live) -- see extendListing.
export function ExtendListingForm({
  listingId,
  type,
  currency,
}: {
  listingId: string;
  type: ListingType;
  currency: string;
}) {
  const [state, action] = useActionState(extendListing, undefined);
  const [extraDays, setExtraDays] = useState("7");
  const days = Math.max(1, Math.trunc(Number(extraDays)) || 1);
  const fee = LISTING_DAILY_RATE[type] * days;

  return (
    <form
      action={action}
      className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800"
    >
      <input type="hidden" name="listingId" value={listingId} />
      <p className="text-xs font-medium">Pay to stay live longer</p>
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
        <span className="text-xs text-zinc-500">extra days = {formatMoney(fee, currency)}</span>
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
    </form>
  );
}

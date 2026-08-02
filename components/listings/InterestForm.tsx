"use client";

import { useActionState } from "react";
import { expressInterest } from "@/lib/actions/orders";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError } from "@/components/ui/FieldError";

export function InterestForm({ listingId, price }: { listingId: string; price: number }) {
  const [state, action] = useActionState(expressInterest, undefined);

  if (state?.success) {
    return (
      <p className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
        Your interest was sent to the owner.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="listingId" value={listingId} />
      <div>
        <label className="mb-1 block text-sm font-medium">Offer amount (KES)</label>
        <input
          name="amount"
          type="number"
          min="0"
          defaultValue={price}
          required
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <FieldError messages={state?.fieldErrors?.amount} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Message (optional)</label>
        <textarea
          name="message"
          rows={3}
          maxLength={1000}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
      <SubmitButton pendingLabel="Sending…">Make order</SubmitButton>
    </form>
  );
}

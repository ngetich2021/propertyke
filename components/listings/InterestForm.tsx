"use client";

import { useId, useState } from "react";
import { useActionState } from "react";
import { expressInterest } from "@/lib/actions/orders";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError } from "@/components/ui/FieldError";
import { sanitizePhoneInput } from "@/lib/phone";

const CONTACT_METHODS = [
  { value: "CALL", label: "Phone call" },
  { value: "SMS", label: "SMS / text" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
] as const;

export function InterestForm({
  listingId,
  price,
  defaultPhone,
}: {
  listingId: string;
  price: number;
  defaultPhone?: string | null;
}) {
  const id = useId();
  const [state, action] = useActionState(expressInterest, undefined);
  const [phone, setPhone] = useState(defaultPhone ?? "");

  if (state?.success) {
    return (
      <p className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
        Your order was sent to the owner — they&apos;ve been emailed your contact details and will follow up.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="listingId" value={listingId} />
      <div>
        <label htmlFor={`${id}-amount`} className="mb-1 block text-sm font-medium">
          Offer amount (KES)
        </label>
        <input
          id={`${id}-amount`}
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
        <label htmlFor={`${id}-contactPhone`} className="mb-1 block text-sm font-medium">
          Your phone number
        </label>
        <input
          id={`${id}-contactPhone`}
          name="contactPhone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
          placeholder="e.g. 0712345678"
          required
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">So the owner can reach you about this order.</p>
        <FieldError messages={state?.fieldErrors?.contactPhone} />
      </div>

      <div>
        <label htmlFor={`${id}-contactMethod`} className="mb-1 block text-sm font-medium">
          Preferred way to be contacted
        </label>
        <select
          id={`${id}-contactMethod`}
          name="contactMethod"
          defaultValue="CALL"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {CONTACT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <FieldError messages={state?.fieldErrors?.contactMethod} />
      </div>

      <div>
        <label htmlFor={`${id}-message`} className="mb-1 block text-sm font-medium">
          Message (optional)
        </label>
        <textarea
          id={`${id}-message`}
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

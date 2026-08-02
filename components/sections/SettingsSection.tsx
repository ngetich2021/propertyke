"use client";

import { useActionState, useState } from "react";
import { updateProfile } from "@/lib/actions/settings";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError } from "@/components/ui/FieldError";
import { sanitizePhoneInput } from "@/lib/phone";

export function SettingsSection({
  user,
}: {
  user: { name?: string | null; email?: string | null; phone?: string | null; businessName?: string | null };
}) {
  const [state, action] = useActionState(updateProfile, undefined);
  const [phone, setPhone] = useState(user.phone ?? "");

  return (
    <div className="flex max-w-sm flex-col gap-4">
      <h2 className="text-lg font-semibold">Settings</h2>
      <form action={action} className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input
            name="name"
            defaultValue={user.name ?? ""}
            required
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <FieldError messages={state?.fieldErrors?.name} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Business name</label>
          <input
            name="businessName"
            defaultValue={user.businessName ?? ""}
            placeholder="Optional"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <FieldError messages={state?.fieldErrors?.businessName} />
          <p className="mt-1 text-xs text-zinc-500">
            Shown as &ldquo;Listed by&rdquo; on your listings instead of your name, and used to
            auto-fill the company name when you advertise.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Phone</label>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
            placeholder="+254 7XX XXX XXX"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <FieldError messages={state?.fieldErrors?.phone} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            disabled
            value={user.email ?? ""}
            className="w-full rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>
        <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
        {state?.success && <p className="text-xs text-green-600 dark:text-green-400">Saved.</p>}
      </form>
    </div>
  );
}

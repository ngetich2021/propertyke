"use client";

import { useActionState, useId, useState } from "react";
import { deleteAccount } from "@/lib/actions/account";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError } from "@/components/ui/FieldError";

export function DeleteAccountForm() {
  const id = useId();
  const [state, action] = useActionState(deleteAccount, undefined);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
      >
        Delete my account
      </button>
    );
  }

  return (
    <form action={action} className="flex max-w-sm flex-col gap-3 rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
      <p className="text-sm font-medium text-red-700 dark:text-red-400">
        This permanently deletes your account, listings, ads, orders, payment history, and support
        chats. This cannot be undone.
      </p>
      <div>
        <label htmlFor={`${id}-confirm`} className="mb-1 block text-sm font-medium">
          Type DELETE to confirm
        </label>
        <input
          id={`${id}-confirm`}
          name="confirm"
          autoComplete="off"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <FieldError messages={state?.fieldErrors?.confirm} />
      </div>
      {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
      <div className="flex items-center gap-3">
        <SubmitButton
          pendingLabel="Deleting…"
          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          Permanently delete account
        </SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-zinc-500 hover:underline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

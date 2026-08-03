"use client";

import { useActionState, useId, useState } from "react";
import { createReport } from "@/lib/actions/reports";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError } from "@/components/ui/FieldError";

export function ReportForm({ listingId }: { listingId: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createReport, undefined);

  if (state?.success) {
    return <p className="text-xs text-zinc-500">Thanks, this listing has been reported.</p>;
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-zinc-500 underline">
        Report this listing
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="listingId" value={listingId} />
      <label htmlFor={`${id}-reason`} className="sr-only">
        What&apos;s wrong with this listing?
      </label>
      <textarea
        id={`${id}-reason`}
        name="reason"
        rows={2}
        placeholder="What's wrong with this listing?"
        required
        minLength={5}
        maxLength={500}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <FieldError messages={state?.fieldErrors?.reason} />
      <SubmitButton
        pendingLabel="Sending…"
        className="w-fit rounded-md bg-zinc-500 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-600"
      >
        Submit report
      </SubmitButton>
    </form>
  );
}

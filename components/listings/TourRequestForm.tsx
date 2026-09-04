"use client";

import { useId, useState } from "react";
import { useActionState } from "react";
import { requestTour } from "@/lib/actions/tours";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FieldError } from "@/components/ui/FieldError";
import { Modal } from "@/components/ui/Modal";

function TourRequestForm({ listingId, onSent }: { listingId: string; onSent: () => void }) {
  const id = useId();
  const [state, action] = useActionState(requestTour, undefined);

  if (state?.success) {
    return (
      <p className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
        Request sent — the owner has been emailed and will confirm a time.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="listingId" value={listingId} />
      <div>
        <label htmlFor={`${id}-date`} className="mb-1 block text-sm font-medium">
          Preferred date &amp; time
        </label>
        <input
          id={`${id}-date`}
          name="preferredDate"
          type="datetime-local"
          required
          min={new Date().toISOString().slice(0, 16)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <FieldError messages={state?.fieldErrors?.preferredDate} />
      </div>
      <div>
        <label htmlFor={`${id}-notes`} className="mb-1 block text-sm font-medium">
          Notes (optional)
        </label>
        <textarea
          id={`${id}-notes`}
          name="notes"
          rows={2}
          maxLength={500}
          placeholder="e.g. how many people, anything you'd like to see"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
      <SubmitButton pendingLabel="Sending…">Request visit</SubmitButton>
      <button type="button" onClick={onSent} className="text-xs text-zinc-500 underline">
        Close
      </button>
    </form>
  );
}

export function TourRequestToggle({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-zinc-700 underline dark:text-zinc-300"
      >
        📅 Book a site visit
      </button>
      {open && (
        <Modal title="Request a site visit" onClose={() => setOpen(false)} maxWidthClassName="max-w-sm">
          <TourRequestForm listingId={listingId} onSent={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

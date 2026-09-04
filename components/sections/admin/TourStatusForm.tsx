"use client";

import { useActionState } from "react";
import { updateTourStatus } from "@/lib/actions/tours";
import { SubmitButton } from "@/components/ui/SubmitButton";

const STATUS_OPTIONS = ["REQUESTED", "CONFIRMED", "DECLINED", "DONE", "CANCELLED"] as const;

export function TourStatusForm({ tourId, currentStatus }: { tourId: string; currentStatus: string }) {
  const [state, action] = useActionState(updateTourStatus, undefined);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="tourId" value={tourId} />
      <select
        name="status"
        defaultValue={currentStatus}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <SubmitButton
        pendingLabel="…"
        className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Update
      </SubmitButton>
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}

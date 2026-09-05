"use client";

import { useActionState } from "react";
import { MoreVertical, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "@/components/ui/popover";
import { updateTourStatus } from "@/lib/actions/tours";
import { SubmitButton } from "@/components/ui/SubmitButton";

const STATUS_OPTIONS = ["REQUESTED", "CONFIRMED", "DECLINED", "DONE", "CANCELLED"] as const;

export function TourActionsMenu({ tourId, currentStatus }: { tourId: string; currentStatus: string }) {
  const [state, action] = useActionState(updateTourStatus, undefined);

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Manage site visit"
        className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <MoreVertical size={16} />
      </PopoverTrigger>
      {/* See RoleActionsMenu for why popup clicks need stopPropagation --
          same portal-bubbles-through-the-component-tree issue applies here. */}
      <PopoverContent align="end" className="w-72" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-1">
          <p className="text-sm font-semibold">Manage site visit</p>
          <PopoverClose
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={14} />
          </PopoverClose>
        </div>

        <form action={action} className="flex flex-col gap-2 border-t border-zinc-200 pt-2.5 dark:border-zinc-800">
          <input type="hidden" name="tourId" value={tourId} />
          <label className="flex flex-col gap-0.5 text-xs font-medium text-zinc-500">
            Status
            <select
              name="status"
              defaultValue={currentStatus}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
          <SubmitButton
            pendingLabel="…"
            className="self-end rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Update
          </SubmitButton>
        </form>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { useActionState } from "react";
import { MoreVertical, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "@/components/ui/popover";
import { setListingStatus } from "@/lib/actions/listings";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { ListingStatus } from "@/app/generated/prisma/client";

export function ListingActionsMenu({ listingId, currentStatus }: { listingId: string; currentStatus: ListingStatus }) {
  const [, action] = useActionState(setListingStatus, undefined);

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Manage listing"
        className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <MoreVertical size={16} />
      </PopoverTrigger>
      {/* See RoleActionsMenu for why popup clicks need stopPropagation --
          same portal-bubbles-through-the-component-tree issue applies here. */}
      <PopoverContent align="end" className="w-72" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-1">
          <p className="text-sm font-semibold">Manage listing</p>
          <PopoverClose
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={14} />
          </PopoverClose>
        </div>

        <form action={action} className="flex flex-col gap-2 border-t border-zinc-200 pt-2.5 dark:border-zinc-800">
          <input type="hidden" name="listingId" value={listingId} />
          <label className="flex flex-col gap-0.5 text-xs font-medium text-zinc-500">
            Status
            <select
              name="status"
              defaultValue={currentStatus}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="PENDING">PENDING</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="REJECTED">REJECTED</option>
              <option value="SOLD">SOLD</option>
              <option value="RENTED">RENTED</option>
            </select>
          </label>
          <SubmitButton
            pendingLabel="…"
            className="self-end rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Update
          </SubmitButton>
        </form>
      </PopoverContent>
    </Popover>
  );
}

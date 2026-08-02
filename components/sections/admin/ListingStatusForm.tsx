"use client";

import { useActionState } from "react";
import { setListingStatus } from "@/lib/actions/listings";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { ListingStatus } from "@/app/generated/prisma/client";

export function ListingStatusForm({ listingId, currentStatus }: { listingId: string; currentStatus: ListingStatus }) {
  const [, action] = useActionState(setListingStatus, undefined);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="listingId" value={listingId} />
      <select
        name="status"
        defaultValue={currentStatus}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="PENDING">PENDING</option>
        <option value="ACTIVE">ACTIVE</option>
        <option value="REJECTED">REJECTED</option>
        <option value="SOLD">SOLD</option>
        <option value="RENTED">RENTED</option>
      </select>
      <SubmitButton
        pendingLabel="…"
        className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Update
      </SubmitButton>
    </form>
  );
}

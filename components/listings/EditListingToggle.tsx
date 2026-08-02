"use client";

import { useState } from "react";
import { ListingForm } from "@/components/listings/ListingForm";
import type { Listing } from "@/app/generated/prisma/client";

export function EditListingToggle({ listing }: { listing: Listing }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        Edit listing
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ListingForm listing={listing} />
      <button onClick={() => setOpen(false)} className="w-fit text-xs text-zinc-500 underline">
        Close editor
      </button>
    </div>
  );
}

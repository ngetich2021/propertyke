"use client";

import { useState } from "react";
import { AdForm } from "@/components/listings/AdForm";
import type { Listing } from "@/app/generated/prisma/client";

export function AdvertiseToggle({
  listings,
  disabled,
  advertiser,
}: {
  listings: Listing[];
  disabled?: boolean;
  advertiser?: { businessName: string | null; phone: string | null };
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        + Advertise
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <AdForm listings={listings} advertiser={advertiser} />
      <button onClick={() => setOpen(false)} className="w-fit text-xs text-zinc-500 underline">
        Cancel
      </button>
    </div>
  );
}

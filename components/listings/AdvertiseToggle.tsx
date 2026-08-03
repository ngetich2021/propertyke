"use client";

import { useState } from "react";
import { AdForm } from "@/components/listings/AdForm";
import { Modal } from "@/components/ui/Modal";
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        + Advertise
      </button>
      {open && (
        <Modal title="Advertise a listing" onClose={() => setOpen(false)}>
          <AdForm listings={listings} advertiser={advertiser} onCreated={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

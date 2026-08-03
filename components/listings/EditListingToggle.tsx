"use client";

import { useState } from "react";
import { ListingForm } from "@/components/listings/ListingForm";
import { Modal } from "@/components/ui/Modal";
import type { Listing } from "@/app/generated/prisma/client";

export function EditListingToggle({ listing }: { listing: Listing }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        Edit listing
      </button>
      {open && (
        // Opened from inside ListingDetailModal (z-60), so this needs to stack above it.
        <Modal title="Edit listing" onClose={() => setOpen(false)} zIndexClassName="z-70">
          <ListingForm listing={listing} />
        </Modal>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { ListingForm, type ManagedOwner } from "@/components/listings/ListingForm";
import { Modal } from "@/components/ui/Modal";

export function AddPropertyToggle({
  disabled,
  hasBusinessName,
  managedOwners,
}: {
  disabled?: boolean;
  hasBusinessName?: boolean;
  managedOwners?: ManagedOwner[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        + Add property
      </button>
      {open && (
        <Modal title="Add a property, land, or rental" onClose={() => setOpen(false)}>
          <ListingForm hasBusinessName={hasBusinessName} managedOwners={managedOwners} onCreated={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

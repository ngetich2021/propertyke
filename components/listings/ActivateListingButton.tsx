"use client";

import { useActionState } from "react";
import { activateListing } from "@/lib/actions/listings";
import { SubmitButton } from "@/components/ui/SubmitButton";

// Fallback for an owner who's signed in but doesn't have the reactivation
// email handy -- same effect as clicking the emailed Activate link (see
// app/api/listings/activate/[token]/route.ts).
export function ActivateListingButton({ listingId }: { listingId: string }) {
  const [, action] = useActionState(activateListing, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="listingId" value={listingId} />
      <SubmitButton
        pendingLabel="…"
        className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
      >
        Activate now
      </SubmitButton>
    </form>
  );
}

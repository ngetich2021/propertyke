"use client";

import { useActionState, useState } from "react";
import { updateAdStatus } from "@/lib/actions/ads";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { AdStatus } from "@/app/generated/prisma/client";

export function AdStatusForm({ adId, status }: { adId: string; status: AdStatus }) {
  const [, action] = useActionState(updateAdStatus, undefined);
  const [note, setNote] = useState("");

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="adId" value={adId} />
      <textarea
        name="adminNote"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note for the advertiser (optional)"
        rows={2}
        maxLength={1000}
        className="w-56 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <div className="flex gap-2">
        {status === "PENDING" && (
          <>
            <SubmitButton
              name="status"
              value="ACTIVE"
              pendingLabel="…"
              className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
            >
              Approve
            </SubmitButton>
            <SubmitButton
              name="status"
              value="REJECTED"
              pendingLabel="…"
              className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
            >
              Reject
            </SubmitButton>
          </>
        )}
        {status === "ACTIVE" && (
          // Pulls a misbehaving ad out of rotation immediately -- getLiveAds
          // and getTargetedAd only ever select status: "ACTIVE" ads, so this
          // takes effect on the next page load, no separate cache-bust needed.
          <SubmitButton
            name="status"
            value="EXPIRED"
            pendingLabel="…"
            className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            Terminate
          </SubmitButton>
        )}
      </div>
    </form>
  );
}

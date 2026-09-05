"use client";

import { useActionState, useId, useState } from "react";
import { MoreVertical, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "@/components/ui/popover";
import { updateAdStatus } from "@/lib/actions/ads";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { AdStatus } from "@/app/generated/prisma/client";

export function AdActionsMenu({ adId, status }: { adId: string; status: AdStatus }) {
  const id = useId();
  const [, action] = useActionState(updateAdStatus, undefined);
  const [note, setNote] = useState("");

  if (status !== "PENDING" && status !== "ACTIVE") return null;

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Manage ad"
        className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <MoreVertical size={16} />
      </PopoverTrigger>
      {/* See RoleActionsMenu for why popup clicks need stopPropagation --
          same portal-bubbles-through-the-component-tree issue applies here. */}
      <PopoverContent align="end" className="w-80" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-1">
          <p className="text-sm font-semibold">Manage ad</p>
          <PopoverClose
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={14} />
          </PopoverClose>
        </div>

        <form action={action} className="flex flex-col gap-2 border-t border-zinc-200 pt-2.5 dark:border-zinc-800">
          <input type="hidden" name="adId" value={adId} />
          <label htmlFor={`${id}-adminNote`} className="flex flex-col gap-0.5 text-xs font-medium text-zinc-500">
            Note for the advertiser
            <textarea
              id={`${id}-adminNote`}
              name="adminNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
              rows={2}
              maxLength={1000}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
          <div className="flex justify-end gap-2">
            {status === "PENDING" && (
              <>
                <SubmitButton
                  name="status"
                  value="ACTIVE"
                  pendingLabel="…"
                  className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                >
                  Approve
                </SubmitButton>
                <SubmitButton
                  name="status"
                  value="REJECTED"
                  pendingLabel="…"
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
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
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
              >
                Terminate
              </SubmitButton>
            )}
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { useActionState } from "react";
import { MoreVertical, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from "@/components/ui/popover";
import { resolveReport } from "@/lib/actions/reports";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function ReportActionsMenu({ reportId }: { reportId: string }) {
  const [, action] = useActionState(resolveReport, undefined);

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Manage report"
        className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <MoreVertical size={16} />
      </PopoverTrigger>
      {/* See RoleActionsMenu for why popup clicks need stopPropagation --
          same portal-bubbles-through-the-component-tree issue applies here. */}
      <PopoverContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-1">
          <p className="text-sm font-semibold">Manage report</p>
          <PopoverClose
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={14} />
          </PopoverClose>
        </div>

        <form action={action} className="flex justify-end gap-2 border-t border-zinc-200 pt-2.5 dark:border-zinc-800">
          <input type="hidden" name="reportId" value={reportId} />
          <SubmitButton
            name="status"
            value="DISMISSED"
            pendingLabel="…"
            className="rounded-md bg-zinc-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-600 dark:bg-zinc-600 dark:hover:bg-zinc-500"
          >
            Dismiss
          </SubmitButton>
          <SubmitButton
            name="status"
            value="RESOLVED"
            pendingLabel="…"
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
          >
            Resolve
          </SubmitButton>
        </form>
      </PopoverContent>
    </Popover>
  );
}

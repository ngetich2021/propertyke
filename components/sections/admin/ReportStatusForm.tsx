"use client";

import { useActionState } from "react";
import { resolveReport } from "@/lib/actions/reports";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function ReportStatusForm({ reportId, status }: { reportId: string; status: "RESOLVED" | "DISMISSED" }) {
  const [, action] = useActionState(resolveReport, undefined);

  return (
    <form action={action} className="flex gap-2">
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton
        pendingLabel="…"
        className={
          status === "RESOLVED"
            ? "rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
            : "rounded-md bg-zinc-500 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-600"
        }
      >
        {status === "RESOLVED" ? "Resolve" : "Dismiss"}
      </SubmitButton>
    </form>
  );
}

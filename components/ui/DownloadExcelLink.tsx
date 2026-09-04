"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

// A plain <a href="/api/export?..."> gives zero feedback while the server
// generates the .xlsx -- the browser's own download indicator doesn't show
// until the response actually starts arriving. Fetching it ourselves lets us
// show a real spinner for the full wait, then hand the browser a completed
// blob to save.
export function DownloadExcelLink({ dataset }: { dataset: string }) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/export?dataset=${dataset}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${dataset}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Fall back to a normal navigation -- still works, just without the
      // in-page spinner.
      window.location.href = `/api/export?dataset=${dataset}`;
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 underline hover:text-zinc-800 disabled:opacity-60 dark:hover:text-zinc-200"
    >
      {pending && <Spinner className="h-3 w-3" />}
      {pending ? "Preparing…" : "Download Excel"}
    </button>
  );
}

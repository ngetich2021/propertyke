"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { manualRefreshProviderHealth } from "@/lib/actions/health";

export function ProviderHealthRefreshButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => manualRefreshProviderHealth())}
      className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
    >
      <RefreshCw size={12} className={isPending ? "animate-spin" : ""} />
      {isPending ? "Checking…" : "Check now"}
    </button>
  );
}

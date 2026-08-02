"use client";

import dynamic from "next/dynamic";

export const ListingLocationMap = dynamic(
  () => import("./ListingLocationMapInner").then((m) => m.ListingLocationMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[200px] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
        Loading map…
      </div>
    ),
  }
);

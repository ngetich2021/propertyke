"use client";

import dynamic from "next/dynamic";

export type { LatLng } from "./LocationMapInner";

export const LocationMap = dynamic(
  () => import("./LocationMapInner").then((m) => m.LocationMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
        Loading map…
      </div>
    ),
  }
);

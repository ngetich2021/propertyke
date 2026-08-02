"use client";

import { useEffect, useRef, useState } from "react";
import { HeroVideo } from "@/components/ads/HeroVideo";
import { useAdReveal } from "@/lib/useAdReveal";
import { ListingLocationMap } from "@/components/listings/ListingLocationMap";
import { ListingPreviewCard } from "@/components/listings/ListingPreviewCard";
import { ListingDetailModal } from "@/components/listings/ListingDetailModal";
import { Spinner } from "@/components/ui/Spinner";

export type LiveAdSlot = {
  listingId: string;
  youtubeUrl: string;
  repeatCount: number | null;
};

// Cycles through every approved ad available for the hero slot, advancing
// to the next one whenever the current video finishes (see
// useYouTubePlayer's onEnded handoff) -- never mid-playback. The available
// `ads` list can change at any time (switching tabs re-scopes it to a
// different category, a location match comes in, etc.), but that must
// never interrupt whatever's already playing -- only the *next* pick, once
// the current video naturally ends, reflects the latest list. `turn`
// forces a fresh remount (fresh player/autoplay) on every advance, even
// when landing back on the same single ad.
//
// The reveal/detail popups (useAdReveal, detailsOpen) are owned here rather
// than by the video itself, specifically so a visitor reading one doesn't
// have it yanked away out from under them the moment the ad it was opened
// from finishes and the slot rotates to the next one -- see useAdReveal.
export function HeroAdCarousel({ ads }: { ads: LiveAdSlot[] }) {
  const adsRef = useRef(ads);
  useEffect(() => {
    adsRef.current = ads;
  }, [ads]);

  const [current, setCurrent] = useState<LiveAdSlot | null>(ads[0] ?? null);
  const [turn, setTurn] = useState(0);
  const reveal = useAdReveal();
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Only ever fires once, the first time `ads` goes from empty to non-empty
  // (e.g. still loading on initial mount) -- setting state directly during
  // render like this is React's sanctioned way to adjust state in response
  // to a prop change. It can't loop: `current` is non-null from then on.
  if (!current && ads.length > 0) {
    setCurrent(ads[0]);
  }

  function advance() {
    const list = adsRef.current;
    const idx = current ? list.findIndex((a) => a.listingId === current.listingId) : -1;
    setCurrent(list.length > 0 ? list[(idx + 1) % list.length] : null);
    setTurn((t) => t + 1);
  }

  if (!current) {
    return (
      <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-lg bg-linear-to-br from-emerald-100 to-sky-100 sm:h-56 dark:from-emerald-950 dark:to-sky-950">
        <svg
          viewBox="0 0 64 64"
          className="h-16 w-16 text-emerald-700/70 sm:h-24 sm:w-24 dark:text-emerald-300/70"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M8 30 32 10l24 20M14 26v26h36V26" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M26 52V38h12v14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  return (
    <>
      <HeroVideo
        key={turn}
        videoUrl={current.youtubeUrl}
        repeatCount={current.repeatCount}
        onEnded={advance}
        onToggleReveal={() => reveal.toggle(current.listingId)}
      />

      {reveal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={reveal.close}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-4 shadow-xl dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Plot location</h3>
              <button
                type="button"
                onClick={reveal.close}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                ×
              </button>
            </div>

            {reveal.isPending && (
              <div className="flex items-center justify-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
                <Spinner className="h-4 w-4" /> Loading listing…
              </div>
            )}
            {!reveal.isPending && reveal.summary && (
              <div className="flex flex-col gap-3">
                {reveal.summary.latitude != null && reveal.summary.longitude != null ? (
                  <ListingLocationMap
                    latitude={reveal.summary.latitude}
                    longitude={reveal.summary.longitude}
                  />
                ) : (
                  reveal.summary.address && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{reveal.summary.address}</p>
                  )
                )}
                <ListingPreviewCard
                  listing={reveal.summary}
                  onOpenDetails={() => {
                    reveal.close();
                    setDetailsOpen(true);
                  }}
                />
              </div>
            )}
            {!reveal.isPending && !reveal.summary && (
              <p className="text-xs text-zinc-500">This listing is no longer available.</p>
            )}
          </div>
        </div>
      )}

      {detailsOpen && reveal.listingId && (
        <ListingDetailModal listingId={reveal.listingId} onClose={() => setDetailsOpen(false)} />
      )}
    </>
  );
}

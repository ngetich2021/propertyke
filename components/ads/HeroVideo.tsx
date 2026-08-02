"use client";

import { useYouTubePlayer } from "@/lib/useYouTubePlayer";

// Just the player + its click-to-reveal overlay. Deliberately dumb: the
// reveal/detail popups used to live here too, but that meant they got torn
// down (and silently closed on the visitor) every time the hero slot
// rotated to a new ad and remounted this component. That state now lives in
// HeroAdCarousel, which never remounts -- see useAdReveal.
export function HeroVideo({
  videoUrl,
  repeatCount,
  onEnded,
  onToggleReveal,
}: {
  videoUrl: string;
  repeatCount?: number | null;
  onEnded?: () => void;
  onToggleReveal: () => void;
}) {
  useYouTubePlayer("hero-live-ad", videoUrl, repeatCount, onEnded);

  return (
    <div className="relative flex h-40 w-full flex-col overflow-hidden rounded-lg bg-black sm:h-56">
      <button
        type="button"
        onClick={onToggleReveal}
        aria-label="Show listing location"
        className="absolute inset-0 z-20 bg-transparent"
      />
      {/* Higher z-index than the reveal-toggle overlay above, so clicks on
          the video reach the player (unmute) instead of the toggle. */}
      <div id="hero-live-ad" className="relative z-30 min-h-0 flex-1" />
      <p className="relative z-0 bg-black/70 px-2 py-1 text-center text-xs text-white">
        Interested? View location →
      </p>
    </div>
  );
}

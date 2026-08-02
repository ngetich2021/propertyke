"use client";

import { useEffect, useRef } from "react";
import { getYouTubeId } from "@/lib/youtube";

type YTPlayer = {
  unMute: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getDuration: () => number;
  destroy: () => void;
};

type YTPlayerConstructor = new (
  elementId: string,
  options: {
    width?: string | number;
    height?: string | number;
    videoId: string;
    playerVars?: Record<string, number | string>;
    events?: {
      onReady?: (event: { target: YTPlayer }) => void;
      onStateChange?: (event: { data: number; target: YTPlayer }) => void;
    };
  }
) => YTPlayer;

declare global {
  interface Window {
    YT?: { Player: YTPlayerConstructor; PlayerState: { ENDED: number } };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const LONG_VIDEO_SECONDS = 5 * 60;

// Module-level (not per-hook-instance) so it survives the hero slot
// rotating to a new ad: each new ad gets a brand-new YT.Player, which
// would otherwise always start back at playerVars.mute=1 (required for
// the very first autoplay) and silently re-mute a visitor who'd already
// unmuted an earlier ad this page load.
let hasUnmutedThisSession = false;

// Shared playback rule for every ad video slot (hero banner, sponsored card):
// videos of 5 minutes or less just loop continuously (cheap to replay).
// Longer videos only replay up to `repeatCount` times total -- that's the
// paid "repeat" feature -- and otherwise play once and stop.
//
// When `onEnded` is passed (the rotating hero slot), a finished video hands
// off to it instead of self-looping once its repeat budget (if any) is
// spent -- that's what lets multiple approved ads take turns in the same
// slot rather than one short video looping forever and starving the rest.
export function useYouTubePlayer(
  elementId: string,
  videoUrl: string,
  repeatCount?: number | null,
  onEnded?: () => void
) {
  const playerRef = useRef<YTPlayer | null>(null);
  // Callers (e.g. the rotating hero carousel) commonly pass a fresh
  // `onEnded` closure on every render. Reading it through a ref -- instead
  // of putting it in the effect's dependency array below -- means an
  // unrelated re-render doesn't tear down and recreate the YouTube player
  // (which would restart/interrupt playback) just because that one prop's
  // identity changed.
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    const videoId = getYouTubeId(videoUrl);
    if (!videoId) return;

    let playsSoFar = 0;

    function createPlayer() {
      playerRef.current = new window.YT!.Player(elementId, {
        // Without explicit dimensions the IFrame API defaults to a fixed
        // 640x390 px iframe regardless of the target element's actual size,
        // leaving empty space around it. Force it to fill its container.
        width: "100%",
        height: "100%",
        videoId: videoId!,
        playerVars: {
          autoplay: 1,
          mute: hasUnmutedThisSession ? 0 : 1,
          controls: 1,
          playsinline: 1,
          // Strip every bit of YouTube's own chrome that the embed API lets
          // an embedder turn off, so this reads as our ad slot rather than
          // a YouTube player: no suggested videos from other channels when
          // it ends, no keyboard shortcuts stealing the page's input focus,
          // no annotation/info-card overlays, minimal branding, and no
          // native fullscreen button (it's a small promo slot, not a
          // dedicated video page).
          rel: 0,
          modestbranding: 1,
          disablekb: 1,
          iv_load_policy: 3,
          cc_load_policy: 0,
          fs: 0,
        },
        events: {
          onReady: (event) => {
            playerRef.current = event.target;
            // A click can land before this player finishes constructing
            // (the iframe API takes a beat to spin up), so `playerVars.mute`
            // above may have been baked in as muted even though the visitor
            // already asked for sound. Re-apply it here so that specific
            // video doesn't end up stuck silent until it rotates away.
            if (hasUnmutedThisSession) {
              try {
                event.target.unMute();
                event.target.playVideo();
              } catch {
                // ignore -- next click will retry via the document listener
              }
            }
          },
          onStateChange: (event) => {
            if (event.data !== window.YT!.PlayerState.ENDED) return;
            // A player from a previous mount that wasn't torn down in time
            // can still fire a stale event here; getDuration wouldn't be
            // callable on it yet (or ever), so just ignore it.
            if (typeof event.target.getDuration !== "function") return;
            const duration = event.target.getDuration();
            const isLong = duration > LONG_VIDEO_SECONDS;

            const shouldReplay = isLong
              ? !!repeatCount && playsSoFar < repeatCount - 1
              : !onEndedRef.current; // no rotation configured: keep looping short videos forever

            if (shouldReplay) {
              playsSoFar += 1;
              event.target.seekTo(0, true);
              event.target.playVideo();
              return;
            }

            onEndedRef.current?.();
          },
        },
      });
    }

    if (window.YT?.Player) {
      createPlayer();
    } else {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    function unmute() {
      try {
        playerRef.current?.unMute();
        playerRef.current?.playVideo();
        hasUnmutedThisSession = true;
      } catch {
        // player not ready yet; ignore
      }
    }

    document.addEventListener("click", unmute);
    return () => {
      document.removeEventListener("click", unmute);
      // Without this, a player from a video that's rotating out keeps
      // running (and can post stale onStateChange events) after its DOM
      // node is gone -- destroy() is what actually stops the iframe.
      try {
        playerRef.current?.destroy();
      } catch {
        // already gone; ignore
      }
      playerRef.current = null;
    };
  }, [elementId, videoUrl, repeatCount]);
}

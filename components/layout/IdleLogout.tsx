"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

const IDLE_TIMEOUT_MS = 3 * 60 * 1000;
const CHECK_INTERVAL_MS = 5000;
const STORAGE_KEY = "lastActivityAt";
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "wheel", "scroll"] as const;

// Signs an inactive visitor out after 3 minutes of no interaction -- a
// signed-in session here can post listings, run paid ads, and see contact
// details, so leaving it open indefinitely on a shared/public machine is a
// real exposure.
//
// "Last activity" is stamped to localStorage (shared across every same-origin
// tab), not just tracked in this component's own state, and each tab polls
// that shared value rather than trusting only its own event listeners.
// Without that, an idle background tab would sign the visitor out of their
// *session* -- not just that tab -- while they're still actively using a
// different one, since the auth cookie is shared across all of them.
export function IdleLogout({ signedIn }: { signedIn: boolean }) {
  useEffect(() => {
    if (!signedIn) return;

    function markActive() {
      try {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {
        // Storage unavailable (private browsing, quota, etc) -- the
        // interval below just falls back to signing out on its own clock.
      }
    }

    markActive();
    ACTIVITY_EVENTS.forEach((event) => document.addEventListener(event, markActive, { passive: true }));

    const interval = setInterval(() => {
      let lastActivity = Date.now();
      try {
        lastActivity = Number(localStorage.getItem(STORAGE_KEY)) || Date.now();
      } catch {
        // ignore -- see above
      }
      if (Date.now() - lastActivity >= IDLE_TIMEOUT_MS) {
        signOut({ callbackUrl: "/" });
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => document.removeEventListener(event, markActive));
      clearInterval(interval);
    };
  }, [signedIn]);

  return null;
}

"use client";

import { useEffect } from "react";

// Registered in every environment, including dev -- Chrome's install
// criteria (what makes it fire beforeinstallprompt, which InstallAppButton
// needs) still check for a registered service worker in a lot of shipped
// versions, so gating this to production-only meant the install button
// could never appear while testing locally. Safe to run in dev too: sw.js
// is network-first for every request (see its own comment) and explicitly
// skips /api/*, so it never serves stale Turbopack chunks or HMR traffic
// over a real network response -- the cache is only ever a fallback for
// when the network request itself fails.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability/offline support is a nice-to-have -- a failed
      // registration (unsupported browser, blocked storage, etc.) shouldn't
      // surface as an error to the user.
    });
  }, []);

  return null;
}

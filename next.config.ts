import type { NextConfig } from "next";

// Standard hardening headers -- the concrete, unambiguous part of "score
// better on security" that doesn't require a third-party account or a
// judgment call about tracking/consent (see lib/auth.ts for why session
// cookies themselves need no extra config here: Auth.js already sets
// httpOnly/secure/sameSite on those by default). No custom
// Content-Security-Policy -- getting that wrong silently breaks Cloudinary
// images, Leaflet map tiles, and the Google sign-in flow, and this
// environment can't exercise every one of those paths to prove a CSP is
// safe before shipping it.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Blocks clickjacking (embedding this site in someone else's iframe) --
  // nothing here relies on being framed.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // geolocation stays enabled for this origin -- lib/geolocation.ts drives
  // the "near me" listing search. Camera/mic aren't used anywhere.
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;

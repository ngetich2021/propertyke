// Self-serve paid badge (see lib/verificationPricing.ts) -- renders nothing
// once verifiedUntil has lapsed, so a stale badge never lingers.
export function VerifiedBadge({ verifiedUntil }: { verifiedUntil?: Date | string | null }) {
  if (!verifiedUntil || new Date(verifiedUntil) <= new Date()) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="Verified"
      className="inline-block h-4 w-4 shrink-0 text-blue-500"
    >
      <title>Verified</title>
      <path d="M12 2 14.5 4.5 18 4l0.5 3.5L22 9l-1.8 3 1.8 3-3.5 1.5L18 20l-3.5-0.5L12 22l-2.5-2.5L6 20l-0.5-3.5L2 15l1.8-3L2 9l3.5-1.5L6 4l3.5 0.5Z" />
      <path
        d="M8.5 12.5 11 15l4.5-5"
        fill="none"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

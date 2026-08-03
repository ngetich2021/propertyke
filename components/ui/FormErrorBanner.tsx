"use client";

import { useEffect, useRef } from "react";

// A server-side rejection (e.g. "this listing isn't paid up") is easy to
// miss at the bottom of a long form -- this renders right at the top instead
// and scrolls itself into view the moment it appears, so it's never buried
// under fields the visitor has already scrolled past.
export function FormErrorBanner({ message }: { message?: string | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message) ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [message]);

  if (!message) return null;

  return (
    <div
      ref={ref}
      role="alert"
      className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
    >
      {message}
    </div>
  );
}

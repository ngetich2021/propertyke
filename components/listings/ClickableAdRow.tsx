"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { AdDetailModal } from "@/components/listings/AdDetailModal";
import type { Ad, Listing } from "@/app/generated/prisma/client";

export function ClickableAdRow({
  ad,
  children,
}: {
  ad: Ad & { listing: Listing };
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        onClick={() => setOpen(true)}
        className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900"
      >
        {children}
      </tr>
      {open && <AdDetailModal ad={ad} onClose={() => setOpen(false)} />}
    </>
  );
}

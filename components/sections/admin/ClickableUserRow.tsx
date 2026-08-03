"use client";

import { useState, type MouseEvent } from "react";
import type { ReactNode } from "react";
import { UserDetailModal } from "@/components/sections/admin/UserDetailModal";
import { CLICKABLE_ROW_CLASS, handleRowKeyDown, isInteractiveRowClick } from "@/lib/clickableRow";
import type { User } from "@/app/generated/prisma/client";

export function ClickableUserRow({ user, children }: { user: User; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  function handleClick(e: MouseEvent<HTMLTableRowElement>) {
    if (isInteractiveRowClick(e)) return;
    setOpen(true);
  }

  return (
    <>
      <tr
        onClick={handleClick}
        onKeyDown={(e) => handleRowKeyDown(e, () => setOpen(true))}
        tabIndex={0}
        className={CLICKABLE_ROW_CLASS}
      >
        {children}
      </tr>
      {open && <UserDetailModal user={user} onClose={() => setOpen(false)} />}
    </>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { PaginatedTable, type TableRow } from "@/components/ui/PaginatedTable";

export function UsersOfficialsTabs({
  head,
  userRows,
  officialRows,
}: {
  head: ReactNode;
  userRows: TableRow[];
  officialRows: TableRow[];
}) {
  const [tab, setTab] = useState<"users" | "officials">("users");

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" className="flex gap-4 border-b border-zinc-200 pb-2 text-sm dark:border-zinc-800">
        <button
          role="tab"
          aria-selected={tab === "users"}
          onClick={() => setTab("users")}
          className={
            tab === "users" ? "font-medium underline underline-offset-4" : "text-zinc-500 dark:text-zinc-400"
          }
        >
          Users ({userRows.length})
        </button>
        <button
          role="tab"
          aria-selected={tab === "officials"}
          onClick={() => setTab("officials")}
          className={
            tab === "officials" ? "font-medium underline underline-offset-4" : "text-zinc-500 dark:text-zinc-400"
          }
        >
          Officials ({officialRows.length})
        </button>
      </div>
      <PaginatedTable
        minWidth="500px"
        head={head}
        rows={tab === "users" ? userRows : officialRows}
        emptyMessage={tab === "users" ? "No users yet." : "No officials yet."}
      />
    </div>
  );
}

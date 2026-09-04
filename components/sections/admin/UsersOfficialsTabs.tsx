"use client";

import { useState, type ReactNode } from "react";
import { DataTable, type DataTableColumnDef } from "@/components/ui/data-table";

export function UsersOfficialsTabs<TData extends { id: string }>({
  columns,
  userData,
  officialData,
  getRowSearchText,
  renderRow,
}: {
  columns: DataTableColumnDef<TData>[];
  userData: TData[];
  officialData: TData[];
  getRowSearchText: (row: TData) => string;
  renderRow: (row: TData, cells: ReactNode) => ReactNode;
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
          Users ({userData.length})
        </button>
        <button
          role="tab"
          aria-selected={tab === "officials"}
          onClick={() => setTab("officials")}
          className={
            tab === "officials" ? "font-medium underline underline-offset-4" : "text-zinc-500 dark:text-zinc-400"
          }
        >
          Officials ({officialData.length})
        </button>
      </div>
      <DataTable
        minWidth="500px"
        columns={columns}
        data={tab === "users" ? userData : officialData}
        getRowSearchText={getRowSearchText}
        renderRow={renderRow}
        emptyMessage={tab === "users" ? "No users yet." : "No officials yet."}
      />
    </div>
  );
}

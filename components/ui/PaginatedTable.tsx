"use client";

import { useState, type ReactNode } from "react";
import { Pagination } from "./Pagination";

// Only the first two columns -- a row serial number, then the row's name/
// title -- stay pinned while scrolling horizontally on wide tables,
// elevated above the rest of the row so other columns slide underneath
// them instead of overlapping. Every other column scrolls.
export const STICKY_COL_1 =
  "sticky left-0 z-10 w-10 bg-white dark:bg-zinc-950";
export const STICKY_COL_2 =
  "sticky left-10 z-10 w-32 truncate bg-white dark:bg-zinc-950";

export function PaginatedTable({
  head,
  rows,
  minWidth = "600px",
  emptyMessage = "Nothing here yet.",
  defaultPageSize = 5,
}: {
  head: ReactNode;
  rows: ReactNode[];
  minWidth?: string;
  emptyMessage?: string;
  defaultPageSize?: number;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyMessage}</p>;
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table style={{ minWidth }} className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500">{head}</thead>
          <tbody>{pageRows}</tbody>
        </table>
      </div>
      {rows.length > pageSize && (
        <Pagination
          page={clampedPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

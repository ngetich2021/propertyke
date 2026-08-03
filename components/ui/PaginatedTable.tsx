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

// `searchText` is a plain-text projection of everything in that row worth
// matching against (title, owner, status, etc.) -- kept separate from
// `node` because the rendered row is often just table cells and icons, not
// something a substring search can usefully read back out of.
export type TableRow = { node: ReactNode; searchText: string };

export function PaginatedTable({
  head,
  rows,
  minWidth = "600px",
  emptyMessage = "Nothing here yet.",
  defaultPageSize = 5,
  searchPlaceholder = "Search…",
}: {
  head: ReactNode;
  rows: TableRow[];
  minWidth?: string;
  emptyMessage?: string;
  defaultPageSize?: number;
  searchPlaceholder?: string;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [query, setQuery] = useState("");

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyMessage}</p>;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = normalizedQuery
    ? rows.filter((r) => r.searchText.toLowerCase().includes(normalizedQuery))
    : rows;

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * pageSize;
  const pageRows = filteredRows.slice(start, start + pageSize);

  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder={searchPlaceholder}
        className="w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      {normalizedQuery && (
        <p className="text-xs text-zinc-500">
          {filteredRows.length} of {rows.length} match{filteredRows.length === 1 ? "" : "es"}
        </p>
      )}
      {filteredRows.length === 0 ? (
        <p className="text-sm text-zinc-500">No matches for &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="overflow-x-auto">
          <table style={{ minWidth }} className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-zinc-500">{head}</thead>
            <tbody>{pageRows.map((r) => r.node)}</tbody>
          </table>
        </div>
      )}
      {filteredRows.length > pageSize && (
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

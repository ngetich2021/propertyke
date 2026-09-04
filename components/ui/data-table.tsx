"use client";

import * as React from "react";
import {
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  metaHelper,
  tableFeatures,
  useTable,
  FlexRender,
  type ColumnDef,
  type ColumnFiltersState,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DataTableColumnMeta = {
  headerClassName?: string;
  cellClassName?: string;
};

// One shared feature set (sorting + column/global filtering + pagination) for
// every table in the app -- all 11 call sites need exactly this combination,
// so registering it once here (rather than per-table) is what TanStack's own
// guidance recommends for a reusable table component. Sort/filter functions
// are supplied directly on individual columns/options below instead of
// through named registries, which needs no feature-slot registration at all.
const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  columnMeta: metaHelper<DataTableColumnMeta>(),
});

export type DataTableColumnDef<TData extends RowData> = ColumnDef<typeof features, TData, unknown>;

const ALL_VALUE = "__all__";

// Reproduces PaginatedTable's old STICKY_COL_1/STICKY_COL_2 -- apply via a
// column's `meta.headerClassName`/`meta.cellClassName`.
export const STICKY_COL_1 = "sticky left-0 z-10 w-10 bg-background";
export const STICKY_COL_2 = "sticky left-10 z-10 w-32 truncate bg-background";

// A minimal structural slice of TanStack's `Column` instead of the real
// (deeply recursive) generic type -- passing the real, differently
// TValue/TData-instantiated `Column<...>` from each call site's header
// callback into a param typed as the full generic trips up TypeScript's
// structural-equality check on recursive types ("two different types with
// this name exist, but they are unrelated"). Only these three methods are
// actually used here, and the real Column instance satisfies this shape.
type SortableColumn = {
  getCanSort: () => boolean;
  getIsSorted: () => false | "asc" | "desc";
  toggleSorting: (desc?: boolean) => void;
};

export function SortableHeader({ label, column }: { label: React.ReactNode; column: SortableColumn }) {
  if (!column.getCanSort()) return <>{label}</>;
  const sorted = column.getIsSorted();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2.5 h-7 px-2"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="ml-1.5 size-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-1.5 size-3.5" />
      ) : (
        <ArrowUpDown className="ml-1.5 size-3.5 text-muted-foreground" />
      )}
    </Button>
  );
}

export function DataTable<TData extends { id: string }>({
  columns,
  data,
  getRowSearchText,
  searchPlaceholder = "Search…",
  statusFilter,
  renderRow,
  minWidth = "600px",
  defaultPageSize = 5,
  emptyMessage = "Nothing here yet.",
}: {
  columns: DataTableColumnDef<TData>[];
  data: TData[];
  /** Global free-text search, replicating the old `searchText` join. */
  getRowSearchText?: (row: TData) => string;
  searchPlaceholder?: string;
  /** Renders a status dropdown filtering the given accessor column. */
  statusFilter?: {
    columnId: string;
    label: string;
    options: { value: string; label: string }[];
  };
  /** Wraps each row's cells -- pass a ClickableRow/ClickableUserRow/etc to keep
   * click-to-open-modal behavior; defaults to a plain TableRow. */
  renderRow?: (row: TData, cells: React.ReactNode) => React.ReactNode;
  minWidth?: string;
  defaultPageSize?: number;
  emptyMessage?: string;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: defaultPageSize });

  // A filter function passed directly on `filterFn` needs no name
  // registration -- but exact-match status filtering still needs one applied
  // to the target column, so inject it here rather than making every call
  // site remember to add it.
  const resolvedColumns = React.useMemo(() => {
    if (!statusFilter) return columns;
    return columns.map((col) => {
      const id = "id" in col && col.id ? col.id : "accessorKey" in col ? String(col.accessorKey) : undefined;
      if (id !== statusFilter.columnId || "filterFn" in col) return col;
      return { ...col, filterFn: equalsFilterFn };
    });
  }, [columns, statusFilter]);

  const table = useTable({
    features,
    columns: resolvedColumns,
    data,
    getRowId: (row) => row.id,
    state: { sorting, globalFilter, columnFilters, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    globalFilterFn: (row, _columnId, filterValue) => {
      const text = getRowSearchText ? getRowSearchText(row.original) : JSON.stringify(row.original);
      return text.toLowerCase().includes(String(filterValue).toLowerCase());
    },
  });

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const statusColumn = statusFilter ? table.getColumn(statusFilter.columnId) : undefined;
  const rows = table.getRowModel().rows;
  const pageCount = table.getPageCount();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          value={globalFilter}
          onChange={(e) => {
            setGlobalFilter(e.target.value);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
          placeholder={searchPlaceholder}
          className="w-full max-w-xs"
        />
        {statusFilter && statusColumn && (
          <Select
            items={[
              { value: ALL_VALUE, label: `All ${statusFilter.label}` },
              ...statusFilter.options,
            ]}
            value={(statusColumn.getFilterValue() as string | undefined) ?? ALL_VALUE}
            onValueChange={(value) => {
              statusColumn.setFilterValue(value === ALL_VALUE ? undefined : value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder={statusFilter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All {statusFilter.label}</SelectItem>
              {statusFilter.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {(globalFilter || (statusFilter && statusColumn?.getIsFiltered())) && (
          <p className="text-xs text-muted-foreground">
            {rows.length} of {data.length} match{rows.length === 1 ? "" : "es"}
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matches for &ldquo;{globalFilter}&rdquo;.</p>
      ) : (
        <Table style={{ minWidth }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={(header.column.columnDef.meta as DataTableColumnMeta | undefined)?.headerClassName}
                  >
                    {header.isPlaceholder ? null : <FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const cells = row.getAllCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={(cell.column.columnDef.meta as DataTableColumnMeta | undefined)?.cellClassName}
                >
                  <FlexRender cell={cell} />
                </TableCell>
              ));
              return renderRow ? renderRow(row.original, cells) : <TableRow key={row.id}>{cells}</TableRow>;
            })}
          </TableBody>
        </Table>
      )}

      {(rows.length > pagination.pageSize || pageCount > 1) && (
        <DataTablePagination
          pageIndex={pagination.pageIndex}
          pageCount={pageCount}
          pageSize={pagination.pageSize}
          canPreviousPage={table.getCanPreviousPage()}
          canNextPage={table.getCanNextPage()}
          onPageChange={(index) => table.setPageIndex(index)}
          onPageSizeChange={(size) => table.setPageSize(size)}
        />
      )}
    </div>
  );
}

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

function DataTablePagination({
  pageIndex,
  pageCount,
  pageSize,
  canPreviousPage,
  canNextPage,
  onPageChange,
  onPageSizeChange,
}: {
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
  onPageChange: (index: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const id = React.useId();
  const pages = Array.from({ length: pageCount }, (_, i) => i);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={!canPreviousPage}
          onClick={() => onPageChange(pageIndex - 1)}
        >
          Prev
        </Button>
        {pages.map((p) => (
          <Button
            key={p}
            type="button"
            variant={p === pageIndex ? "default" : "ghost"}
            size="xs"
            aria-current={p === pageIndex ? "page" : undefined}
            aria-label={`Page ${p + 1}`}
            onClick={() => onPageChange(p)}
          >
            {p + 1}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={!canNextPage}
          onClick={() => onPageChange(pageIndex + 1)}
        >
          Next
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <label htmlFor={`${id}-page-size-select`}>Rows per page:</label>
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger id={`${id}-page-size-select`} size="sm" className="h-7 w-16">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/** A status-enum filter function for use directly on a column's `filterFn`. */
export function equalsFilterFn(row: { getValue: (id: string) => unknown }, columnId: string, filterValue: unknown) {
  if (filterValue === undefined) return true;
  return String(row.getValue(columnId)) === String(filterValue);
}

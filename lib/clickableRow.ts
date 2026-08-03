import type { KeyboardEvent, MouseEvent } from "react";

// A row's own onClick (defined inside a client component, e.g. ClickableRow)
// opens its detail modal -- but interactive controls nested inside that row
// (a phone link, a status dropdown, a button) need their own click to still
// work instead of also triggering the row. Server components can't attach
// onClick/stopPropagation directly to those nested elements themselves (that
// throws "Event handlers cannot be passed to Client Component props" --
// function props created in a Server Component can't cross the client
// boundary), so this filters by the click's actual target instead, entirely
// from within the client-side row handler.
export function isInteractiveRowClick(e: MouseEvent<HTMLElement>): boolean {
  return !!(e.target as HTMLElement).closest("a, button, select, input, textarea, label");
}

// Rows are made focusable (tabIndex=0) so their detail modal is reachable
// without a mouse -- this is the keyboard equivalent of isInteractiveRowClick
// above: Enter/Space activate the row exactly like a click would, unless the
// key came from a nested interactive element (that already handles its own
// Enter/Space and shouldn't also open the row's modal).
export function handleRowKeyDown(e: KeyboardEvent<HTMLElement>, onActivate: () => void) {
  if (e.key !== "Enter" && e.key !== " ") return;
  if ((e.target as HTMLElement).closest("a, button, select, input, textarea, label")) return;
  e.preventDefault();
  onActivate();
}

export const CLICKABLE_ROW_CLASS =
  "cursor-pointer border-t border-zinc-100 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:border-zinc-900 dark:hover:bg-zinc-900 dark:focus-visible:ring-blue-400";

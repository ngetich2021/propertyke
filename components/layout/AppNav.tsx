"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { useSearchParams } from "next/navigation";
import { BASE_TABS, isTab, type Tab } from "@/lib/nav";

// Reads its own pending state from the nearest ancestor <Link>. A plain
// aria-hidden dot (not the full Spinner, which carries its own
// role="status" live region) so every nav link doesn't add a screen-reader
// announcement -- it's a fixed-size, always-rendered element with only its
// opacity toggled, and only fades in after a short delay so fast
// navigations don't flash it.
export function NavLinkPendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`ml-1 inline-block h-2.5 w-2.5 align-[-1px] ${
        pending ? "animate-spin rounded-full border-[1.5px] border-current border-t-transparent opacity-60" : "opacity-0"
      }`}
    />
  );
}

// Every tab-like navigation in the app (main tabs, account sub-tabs, admin
// sections -- see AccountSection) goes through this one component, so a
// pending hint added here covers all of them at once.
export function NavLink({
  href,
  active,
  children,
  danger,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      // data-active lets ScrollableTabs find and auto-reveal the current
      // tab without either component needing to know about the other.
      data-active={active || undefined}
      className={`shrink-0 text-sm font-medium whitespace-nowrap ${
        active
          ? danger
            ? "text-red-600 underline dark:text-red-400"
            : "underline underline-offset-4"
          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      }`}
    >
      {children}
      <NavLinkPendingHint />
    </Link>
  );
}

// Lives in the root layout (alongside AppHeader, in the same sticky bar) so
// it survives tab navigation instead of remounting per-page -- which means
// it can't receive the active tab as a prop from a page's searchParams the
// way it used to. Reads it client-side instead, same as HeroAdSlot does for
// the same reason.
export function AppNav({ signedIn }: { signedIn: boolean }) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") ?? undefined;
  const activeTab: Tab = isTab(tabParam) ? tabParam : "lands";
  const tabs = BASE_TABS.filter((t) => t.key !== "account" || signedIn);

  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2">
        {tabs.map((t) => (
          <NavLink key={t.key} href={`/?tab=${t.key}`} active={activeTab === t.key}>
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BASE_TABS, isTab, type Tab } from "@/lib/nav";

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
      className={`text-sm font-medium ${
        active
          ? danger
            ? "text-red-600 underline dark:text-red-400"
            : "underline underline-offset-4"
          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      }`}
    >
      {children}
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

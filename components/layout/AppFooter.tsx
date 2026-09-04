import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200 py-4 text-center text-xs text-zinc-500 dark:border-zinc-800">
      <Link href="/terms" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
        Terms &amp; Conditions
      </Link>
    </footer>
  );
}

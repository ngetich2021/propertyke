// Off-screen until focused -- lets keyboard/screen-reader users jump past
// the sticky header (logo, install/theme/auth buttons, hero ad, nav tabs)
// straight to the page content instead of tabbing through all of it first.
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-zinc-900 focus:shadow-lg dark:focus:bg-zinc-900 dark:focus:text-zinc-100"
    >
      Skip to content
    </a>
  );
}

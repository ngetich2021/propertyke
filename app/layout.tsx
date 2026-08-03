import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { IdleLogout } from "@/components/layout/IdleLogout";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import { SkipToContent } from "@/components/layout/SkipToContent";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { getSession } from "@/lib/dal";
import { LocationProvider } from "@/lib/locationContext";

// Applies the persisted (or system) theme's `.dark` class before hydration
// so there's no flash of the wrong theme -- ThemeProvider (a client
// component, too late to run before first paint) just keeps React's state
// in sync with whatever this already set. suppressHydrationWarning on
// <html> below is required because of that: this script mutates the
// server-rendered <html> element's attributes before React hydrates it.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var theme = stored === "light" || stored === "dark" ? stored : "system";
    var resolved = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    if (resolved === "dark") document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {}
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PropertyKE",
  description: "Find and list lands, properties, and rentals.",
  appleWebApp: {
    capable: true,
    title: "PropertyKE",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <ThemeProvider>
          <LocationProvider>
            <SkipToContent />
            <ServiceWorkerRegister />
            <IdleLogout signedIn={!!session} />
            {/* Header (video ad + auth) and the tab nav stick together as one
                bar -- a single sticky wrapper instead of positioning each
                independently, since the header's height (the ad slot) isn't
                fixed, which would make a static `top` offset for the nav
                unreliable. */}
            <div className="sticky top-0 z-40 flex flex-col bg-white dark:bg-zinc-950">
              <AppHeader session={session} />
              <AppNav signedIn={!!session} />
            </div>
            {children}
          </LocationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

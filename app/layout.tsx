import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { IdleLogout } from "@/components/layout/IdleLogout";
import { getSession } from "@/lib/dal";
import { LocationProvider } from "@/lib/locationContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lands & Properties",
  description: "Find and list lands, properties, and rentals.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocationProvider>
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
      </body>
    </html>
  );
}

import Image from "next/image";
import Link from "next/link";
import type { Session } from "next-auth";
import { AuthButton } from "./AuthButton";
import { InstallAppButton } from "./InstallAppButton";
import { ThemeToggle } from "./ThemeToggle";
import { SupportButton } from "./SupportButton";
import { NavLinkPendingHint } from "./AppNav";
import { HeroAdSlot } from "@/components/ads/HeroAdSlot";
import { getSupportContact } from "@/lib/support";

// Ad fetching lives entirely in HeroAdSlot (client-side) now, not here --
// AppHeader sits in the root layout so the video survives tab navigation,
// but that also means it never sees which tab (Lands/Properties/Rentals) is
// active. HeroAdSlot reads that itself via useSearchParams so the ad shown
// actually matches the category being browsed instead of showing the same
// ad on every tab regardless of its listing's type.
export async function AppHeader({ session }: { session: Session | null }) {
  const supportContact = await getSupportContact();
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="PropertyKE" width={32} height={32} className="rounded-full" priority />
            <span className="text-lg font-semibold">PropertyKE</span>
            <NavLinkPendingHint />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <SupportButton contact={supportContact} signedIn={!!session} />
            <InstallAppButton />
            <AuthButton signedIn={!!session} />
          </div>
        </div>
        <HeroAdSlot />
      </div>
    </header>
  );
}

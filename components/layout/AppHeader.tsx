import type { Session } from "next-auth";
import { AuthButton } from "./AuthButton";
import { HeroAdSlot } from "@/components/ads/HeroAdSlot";

// Ad fetching lives entirely in HeroAdSlot (client-side) now, not here --
// AppHeader sits in the root layout so the video survives tab navigation,
// but that also means it never sees which tab (Lands/Properties/Rentals) is
// active. HeroAdSlot reads that itself via useSearchParams so the ad shown
// actually matches the category being browsed instead of showing the same
// ad on every tab regardless of its listing's type.
export async function AppHeader({ session }: { session: Session | null }) {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4">
        <HeroAdSlot />
        <div className="flex items-center justify-end">
          <AuthButton signedIn={!!session} />
        </div>
      </div>
    </header>
  );
}

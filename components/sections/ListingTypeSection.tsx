import { countListings } from "@/lib/actions/listings";
import { MapSearch } from "@/components/listings/MapSearch";
import type { ListingType } from "@/app/generated/prisma/client";

export async function ListingTypeSection({ type }: { type: ListingType }) {
  let count = 0;
  try {
    count = await countListings(type);
  } catch (err) {
    // The listing count is decorative (just the "N available" header); a
    // DB/network hiccup shouldn't take the whole page down over it.
    console.error("Failed to count listings", err);
  }

  return <MapSearch type={type} count={count} />;
}

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocation } from "@/lib/locationContext";
import { getLiveAds, getTargetedAd } from "@/lib/actions/ads";
import { TAB_LISTING_TYPE, type Tab } from "@/lib/nav";
import { HeroAdCarousel, type LiveAdSlot } from "@/components/ads/HeroAdCarousel";

// Builds what plays in the header banner. Lives client-side (rather than
// being fetched once in the server-rendered AppHeader) for two reasons:
//  - it needs the visitor's location (see LocationProvider), and
//  - it needs to know which tab is active (Lands/Properties/Rentals), so an
//    ad for a rental doesn't keep playing while browsing Lands. AppHeader
//    sits in the root layout to survive tab navigation, so it never
//    receives the tab itself -- useSearchParams reads it directly instead,
//    and updates live without the layout (or the video) remounting.
//
// A location-targeted ad matching both the visitor and the active category
// goes first in the rotation (priority), with the category's "Everywhere"
// ads following as alternatives -- one combined rotation, not either/or.
//
// Strictly scoped to the active category -- an ad for Properties must only
// ever show while browsing Properties, never leaking into Lands or Rentals.
// If nothing matches the active category, the slot shows its empty
// placeholder rather than borrowing an ad from an unrelated category.
export function HeroAdSlot() {
  const { location } = useLocation();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") as Tab | null;
  const type = tab && tab in TAB_LISTING_TYPE ? TAB_LISTING_TYPE[tab as keyof typeof TAB_LISTING_TYPE] : undefined;

  const [everywhereAds, setEverywhereAds] = useState<LiveAdSlot[]>([]);
  const [targetedAd, setTargetedAd] = useState<LiveAdSlot | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLiveAds(type).then((ads) => {
      if (!cancelled) setEverywhereAds(ads);
    });
    return () => {
      cancelled = true;
    };
  }, [type]);

  useEffect(() => {
    // Location never reverts to null once set, so there's nothing to reset
    // here -- just skip the lookup until one is known.
    if (!location) return;
    let cancelled = false;
    getTargetedAd(location.lat, location.lng, type).then((ad) => {
      if (cancelled) return;
      // A stale, previous-tab match shouldn't linger once the category
      // changes and nothing new matches it.
      setTargetedAd(
        ad ? { listingId: ad.listingId, youtubeUrl: ad.youtubeUrl, repeatCount: ad.repeatCount } : null
      );
    });
    return () => {
      cancelled = true;
    };
  }, [location, type]);

  const ads = targetedAd ? [targetedAd, ...everywhereAds] : everywhereAds;

  return <HeroAdCarousel ads={ads} />;
}

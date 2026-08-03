"use client";

import { useEffect, useState } from "react";
import { useLocation } from "@/lib/locationContext";
import { getLiveAds, getTargetedAd } from "@/lib/actions/ads";
import { HeroAdCarousel, type LiveAdSlot } from "@/components/ads/HeroAdCarousel";

// Builds what plays in the header banner. Lives client-side (rather than
// being fetched once in the server-rendered AppHeader) because it needs the
// visitor's location (see LocationProvider) to bring in nearby
// location-targeted ads.
//
// Deliberately NOT scoped to the active tab (Lands/Properties/Rentals): a
// visitor browsing Lands may well be interested in a Rental or Property ad
// too, and with only a handful of ads running at a time, scoping the pool
// to just the active category left it with as few as zero-to-one ad to
// rotate through on some tabs -- which looked like the video wasn't
// looping/continuous at all. Every approved "Everywhere" ad plus every
// location-targeted ad within range now rotates together, regardless of
// what's being browsed.
//
// A location-targeted ad matching the visitor goes first in the rotation
// (priority), with "Everywhere" ads following as alternatives -- one
// combined rotation, not either/or.
export function HeroAdSlot() {
  const { location } = useLocation();

  const [everywhereAds, setEverywhereAds] = useState<LiveAdSlot[]>([]);
  const [targetedAd, setTargetedAd] = useState<LiveAdSlot | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLiveAds().then((ads) => {
      if (!cancelled) setEverywhereAds(ads);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Location never reverts to null once set, so there's nothing to reset
    // here -- just skip the lookup until one is known.
    if (!location) return;
    let cancelled = false;
    getTargetedAd(location.lat, location.lng).then((ad) => {
      if (cancelled) return;
      setTargetedAd(
        ad ? { listingId: ad.listingId, youtubeUrl: ad.youtubeUrl, repeatCount: ad.repeatCount } : null
      );
    });
    return () => {
      cancelled = true;
    };
  }, [location]);

  const ads = targetedAd ? [targetedAd, ...everywhereAds] : everywhereAds;

  return <HeroAdCarousel ads={ads} />;
}

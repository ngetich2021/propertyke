"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getNearbyListings } from "@/lib/actions/listings";
import { useLocation } from "@/lib/locationContext";
import { LocationPicker } from "./LocationPicker";
import { ListingCard } from "./ListingCard";
import { Spinner } from "@/components/ui/Spinner";
import type { Listing, ListingType } from "@/app/generated/prisma/client";
import type { LatLng } from "@/lib/geolocation";

const NOUN: Record<ListingType, string> = {
  LAND: "lands",
  PROPERTY: "properties",
  RENTAL: "rentals",
};

export function MapSearch({ type, count }: { type: ListingType; count: number }) {
  const { setLocation } = useLocation();
  const [point, setPoint] = useState<LatLng | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(10);
  const [radiusInput, setRadiusInput] = useState("10");
  const [results, setResults] = useState<(Listing & { distanceKm: number })[] | null>(null);
  const DEFAULT_VISIBLE = 3;
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE);
  const [moreInput, setMoreInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // An earlier search (e.g. the initial radius=10 lookup) can resolve after
  // a later one (e.g. the radius=1000 lookup right behind it) if Turso is
  // slow that moment, silently clobbering the newer, correct results with
  // the older, narrower ones. Only ever commit the response for the most
  // recently issued search.
  const requestIdRef = useRef(0);

  function runSearch(coords: LatLng, radius: number | null) {
    const requestId = ++requestIdRef.current;
    startTransition(async () => {
      const nearby = await getNearbyListings(type, coords.lat, coords.lng, radius);
      if (requestId !== requestIdRef.current) return;
      setResults(nearby);
      setVisibleCount(DEFAULT_VISIBLE);
    });
  }

  function showMore() {
    const requested = Math.trunc(Number(moreInput));
    if (!Number.isFinite(requested) || requested <= visibleCount) return;
    setVisibleCount(requested);
    setMoreInput("");
  }

  function handlePick(coords: LatLng) {
    setPoint(coords);
    // Also drives the header's ad slot -- see HeroAdSlot, which shows a
    // location-targeted ad (if any matches) alongside the "Everywhere"
    // rotation, so there's a single ad player instead of a second one here.
    setLocation(coords);
    runSearch(coords, radiusKm);
  }

  function handleRadiusInput(raw: string) {
    setRadiusInput(raw);
    const next = raw.trim() === "" ? null : Math.max(1, Number(raw));
    if (raw.trim() !== "" && Number.isNaN(next)) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setRadiusKm(next);
      if (point) runSearch(point, next);
    }, 400);
  }

  function clear() {
    setResults(null);
    setPoint(null);
    setVisibleCount(DEFAULT_VISIBLE);
  }

  // Switching tabs (Lands/Properties/Rentals) renders <MapSearch type={...}
  // .../> at the same spot in the tree, so React reuses this exact
  // component instance instead of remounting it -- only `type`/`count`
  // change, everything else (point, results) stays as-is by default. Left
  // alone, that means the previous tab's results just keep showing under
  // the new tab's label.
  //
  // Clearing the stale results is a same-render state adjustment (React's
  // sanctioned way to respond to a changed prop -- see also
  // HeroAdCarousel), not a side effect, so it happens directly during
  // render rather than in a useEffect. Actually re-fetching for the new
  // type *is* a side effect (a network call), so that part stays in an
  // effect below -- keeping the already-picked point/radius, so the
  // visitor isn't forced to re-pick a location on every tab switch.
  const [prevType, setPrevType] = useState(type);
  if (type !== prevType) {
    setPrevType(type);
    setResults(null);
    setVisibleCount(DEFAULT_VISIBLE);
  }

  useEffect(() => {
    if (point) runSearch(point, radiusKm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const noun = NOUN[type];
  const searchActive = results !== null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-500">or find {noun} near you</p>
        <LocationPicker value={point} onChange={handlePick} />

        {point && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <label htmlFor={`radius-${type}`}>Radius (km):</label>
            <input
              id={`radius-${type}`}
              type="number"
              min={1}
              step="any"
              value={radiusInput}
              onChange={(e) => handleRadiusInput(e.target.value)}
              placeholder="10"
              className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        )}

        {isPending && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Spinner className="h-3.5 w-3.5" />
            Searching nearby {noun}…
          </div>
        )}
      </div>

      {!searchActive && (
        <div className="rounded-lg bg-zinc-100 py-10 text-center dark:bg-zinc-900">
          <p className="text-3xl font-bold text-zinc-500 dark:text-zinc-400">
            {count.toLocaleString()} {noun} available
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Pick a spot on the map above to see listings within your chosen radius
          </p>
        </div>
      )}

      {searchActive && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">{results.length} {noun} nearby</p>
            <button onClick={clear} className="text-xs text-zinc-500 underline">
              Clear
            </button>
          </div>
          {results.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Nothing {radiusKm === null ? "" : `within ${radiusKm}km `}of that spot yet.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {results.slice(0, visibleCount).map((item) => (
                  <div key={item.id} className="relative">
                    <ListingCard listing={item} />
                    <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium shadow dark:bg-zinc-900/90">
                      {item.distanceKm.toFixed(1)} km
                    </span>
                  </div>
                ))}
              </div>
              {results.length > visibleCount && (
                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                  <span>
                    Showing {Math.min(visibleCount, results.length)} of {results.length}.
                  </span>
                  <input
                    type="number"
                    min={visibleCount + 1}
                    max={results.length}
                    value={moreInput}
                    onChange={(e) => setMoreInput(e.target.value)}
                    placeholder="e.g. 10"
                    className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <button
                    type="button"
                    onClick={showMore}
                    className="rounded-md border border-zinc-300 px-2 py-1 font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    Show more
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleCount(results.length)}
                    className="text-zinc-500 underline"
                  >
                    Show all
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

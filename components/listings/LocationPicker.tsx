"use client";

import { useRef, useState } from "react";
import { LocationMap } from "./LocationMap";
import { getCurrentLocation, type LatLng } from "@/lib/geolocation";
import { Spinner } from "@/components/ui/Spinner";

type Stage = "choose" | "map" | "summary";

export function LocationPicker({
  value,
  onChange,
  mapHeight,
  mapLabel,
}: {
  value: LatLng | null;
  onChange: (coords: LatLng) => void;
  mapHeight?: string;
  mapLabel?: string;
}) {
  const [stage, setStage] = useState<Stage>(value ? "summary" : "choose");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firedRef = useRef(false);

  async function handleMyLocation() {
    if (firedRef.current) return;
    firedRef.current = true;
    setLocating(true);
    setError(null);
    try {
      const coords = await getCurrentLocation();
      onChange(coords);
      setStage("summary"); // "My location" never opens the map.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read your location.");
    } finally {
      setLocating(false);
      firedRef.current = false;
    }
  }

  if (stage === "map") {
    return (
      <LocationMap
        value={value}
        onChange={(coords) => {
          onChange(coords);
          setStage("summary");
        }}
        onClose={() => setStage(value ? "summary" : "choose")}
        height={mapHeight}
        label={mapLabel}
      />
    );
  }

  if (stage === "summary" && value) {
    return (
      <div className="flex items-center justify-between rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
        <span>
          📍 {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </span>
        <button
          type="button"
          onClick={() => setStage("choose")}
          className="text-xs text-zinc-500 underline"
        >
          Change location
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleMyLocation}
          disabled={locating}
          className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {locating ? (
            <>
              <Spinner className="h-3.5 w-3.5" /> Locating…
            </>
          ) : (
            "📍 My location"
          )}
        </button>
        <button
          type="button"
          onClick={() => setStage("map")}
          className="flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          🗺️ Use map
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

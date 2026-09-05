"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L, { type LeafletEvent } from "leaflet";
import { Search } from "lucide-react";
import { findMapLocation } from "@/lib/actions/listings";

// Default Leaflet marker icons reference relative image paths that don't
// resolve under bundlers; point them at the CDN copy instead.
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const NAIROBI: [number, number] = [-1.286389, 36.817223];
const MIN_PICK_ZOOM = 15;

export type LatLng = { lat: number; lng: number };

function ClickHandler({ onPick }: { onPick: (coords: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Zoom/pan in close enough to see the surrounding area clearly when a new
// pending point is dropped, without zooming back out if the user had
// already zoomed in further, and without re-firing on every drag tick.
function FlyToOnChange({ target }: { target: LatLng | null }) {
  const map = useMap();
  const prevRef = useRef<LatLng | null>(null);

  useEffect(() => {
    if (!target) return;
    if (prevRef.current?.lat === target.lat && prevRef.current?.lng === target.lng) return;
    prevRef.current = target;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), MIN_PICK_ZOOM));
  }, [target, map]);

  return null;
}

// Leaflet measures its container's size on mount. Inside a flex/dynamically-
// mounted layout, that measurement can happen before the layout settles,
// leaving the map cropped or missing tiles until the window is resized.
// Explicitly re-measuring after mount (and again after the fly/zoom
// animation) fixes that without requiring user interaction.
function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const timers = [50, 300].map((delay) => setTimeout(() => map.invalidateSize(), delay));
    return () => timers.forEach(clearTimeout);
  }, [map]);
  return null;
}

export function LocationMapInner({
  value,
  onChange,
  onClose,
  height = "360px",
  label = "Tap the map, then drag the pin to fine-tune",
}: {
  value: LatLng | null;
  onChange: (coords: LatLng) => void;
  onClose?: () => void;
  height?: string;
  label?: string;
}) {
  // A tap only sets a *pending* pin; nothing is committed until the user
  // explicitly confirms, so a stray or approximate click can still be
  // corrected by dragging the pin before it's accepted.
  const [pending, setPending] = useState<LatLng | null>(value);
  // Satellite shows real ground (fields, tracks, buildings) regardless of
  // whether OSM volunteers have mapped roads there -- more reliable for
  // rural areas than the vector street style, which can render near-blank.
  const [layer, setLayer] = useState<"satellite" | "street">("satellite");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();

  function handleDragEnd(e: LeafletEvent) {
    const marker = e.target as L.Marker;
    const pos = marker.getLatLng();
    setPending({ lat: pos.lat, lng: pos.lng });
  }

  // Lets someone jump straight to a location they were shared -- as raw
  // coordinates (e.g. copy-pasted from a WhatsApp location share) or as a
  // place name like "Kapsowar" -- instead of only being able to tap around
  // the map to find it. Only moves the pending pin (see FlyToOnChange
  // below); still requires "Confirm location" like a tap or drag would.
  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setSearchError(null);
    startSearch(async () => {
      const result = await findMapLocation(searchQuery);
      if ("error" in result) {
        setSearchError(result.error);
        return;
      }
      setPending({ lat: result.lat, lng: result.lng });
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <Search size={14} className="shrink-0 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search coordinates (1.234, 36.789) or a place name…"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-zinc-400"
        />
        <button
          type="submit"
          disabled={isSearching || !searchQuery.trim()}
          className="shrink-0 rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {isSearching ? "Searching…" : "Go"}
        </button>
      </form>
      {searchError && (
        <p className="border-b border-zinc-200 bg-zinc-50 px-3 pb-2 text-xs text-red-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-red-400">
          {searchError}
        </p>
      )}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-xs text-zinc-500">{label}</span>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Map layer" className="flex gap-1 rounded-md border border-zinc-300 p-0.5 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setLayer("satellite")}
              aria-pressed={layer === "satellite"}
              className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                layer === "satellite"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500"
              }`}
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => setLayer("street")}
              aria-pressed={layer === "street"}
              className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                layer === "street"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500"
              }`}
            >
              Street
            </button>
          </div>
          <button
            type="button"
            onClick={() => pending && onChange(pending)}
            disabled={!pending}
            className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Confirm location
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close map"
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <div style={{ height }}>
        <MapContainer
          center={pending ? [pending.lat, pending.lng] : NAIROBI}
          zoom={pending ? MIN_PICK_ZOOM : 6}
          style={{ height: "100%", width: "100%" }}
        >
          {layer === "satellite" ? (
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS community"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          ) : (
            // CARTO's raster basemaps (formerly free/anonymous) now require
            // an API key -- without one they just serve a watermarked
            // "API KEY REQUIRED" placeholder tile instead of an error, which
            // is what was actually showing here. Esri's World_Street_Map
            // needs no key, same as the Satellite layer above.
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Source: Esri, HERE, Garmin, USGS, and the GIS community"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            />
          )}
          <ClickHandler onPick={setPending} />
          <FlyToOnChange target={pending} />
          <InvalidateSizeOnMount />
          {pending && (
            <Marker
              position={[pending.lat, pending.lng]}
              icon={markerIcon}
              draggable
              eventHandlers={{ dragend: handleDragEnd }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}

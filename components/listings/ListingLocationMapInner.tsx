"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";

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

// Read-only pin drop for showing where a plot is — no click/drag handlers,
// unlike LocationMapInner which is the editable picker used when posting a listing.
export function ListingLocationMapInner({
  latitude,
  longitude,
  height = "200px",
}: {
  latitude: number;
  longitude: number;
  height?: string;
}) {
  // Vector street tiles (Voyager) only show roads/labels where OSM
  // volunteers have actually mapped them -- for a lot of rural Kenya that's
  // effectively blank. Satellite imagery shows the real ground (fields,
  // tracks, buildings) regardless of tagging, so it's the more reliably
  // "tangible" default; street stays a click away for areas that do have
  // labeled roads.
  const [layer, setLayer] = useState<"satellite" | "street">("satellite");

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex justify-end gap-1 border-b border-zinc-200 bg-zinc-50 px-2 py-1 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setLayer("satellite")}
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            layer === "satellite"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          }`}
        >
          Satellite
        </button>
        <button
          type="button"
          onClick={() => setLayer("street")}
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            layer === "street"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          }`}
        >
          Street
        </button>
      </div>
      <div style={{ height }}>
        <MapContainer
          center={[latitude, longitude]}
          zoom={16}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          {layer === "satellite" ? (
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS community"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          ) : (
            // CartoDB's "Voyager" style renders roads, streets, and place
            // labels much more legibly than plain OSM tiles where that data
            // exists -- same underlying OSM data, clearer cartography.
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              detectRetina
            />
          )}
          <Marker position={[latitude, longitude]} icon={markerIcon} />
        </MapContainer>
      </div>
    </div>
  );
}

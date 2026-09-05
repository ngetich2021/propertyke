import "server-only";

// A fuller, human-readable address for the exact point picked on the map --
// used to auto-fill a listing's Address field so it isn't typed out by hand
// right after being pinpointed on the map (the same information twice).
// Deliberately a separate call from reverseGeocode below (which only wants
// the nearest town name, at a coarser zoom) rather than reusing its result.
export async function reverseGeocodeAddress(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      {
        headers: {
          "User-Agent": "PropertiesMarketplace/1.0 (contact: ngetichjustine1@gmail.com)",
        },
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.display_name === "string" ? data.display_name : null;
  } catch {
    return null;
  }
}

export type PlaceMatch = { lat: number; lng: number; label: string };

// Forward geocoding -- turns a typed place name (e.g. "Kapsowar") into
// coordinates, so a search box on the map can jump straight there. Biased to
// Kenya (countrycodes=ke) since that's where every listing on this platform
// actually is; without that bias a short/common place name tends to match
// somewhere else in the world first.
export async function searchPlace(query: string): Promise<PlaceMatch | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&countrycodes=ke&limit=1`,
      {
        headers: {
          "User-Agent": "PropertiesMarketplace/1.0 (contact: ngetichjustine1@gmail.com)",
        },
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const match = Array.isArray(data) ? data[0] : null;
    if (!match) return null;
    const lat = Number(match.lat);
    const lng = Number(match.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, label: typeof match.display_name === "string" ? match.display_name : q };
  } catch {
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      {
        headers: {
          "User-Agent": "PropertiesMarketplace/1.0 (contact: ngetichjustine1@gmail.com)",
        },
        // A point's nearest town doesn't change; cache for a day to stay
        // well within Nominatim's usage policy.
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address ?? {};
    const town =
      addr.town || addr.village || addr.suburb || addr.city || addr.county || addr.state;
    return town ?? null;
  } catch {
    return null;
  }
}

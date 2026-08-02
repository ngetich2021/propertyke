import "server-only";

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

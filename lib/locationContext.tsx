"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentLocation, type LatLng } from "@/lib/geolocation";

type LocationContextValue = {
  location: LatLng | null;
  setLocation: (coords: LatLng) => void;
};

const LocationContext = createContext<LocationContextValue | null>(null);

// Shared "where is this visitor" state. Seeded once from browser geolocation
// on first load (silently -- a denial just leaves it null), and can be
// overridden by explicitly picking a point on the map anywhere in the app
// (see MapSearch). The header's ad slot reads this to decide whether a
// location-targeted ad should take over from the "Everywhere" rotation.
export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LatLng | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentLocation()
      .then((coords) => {
        if (!cancelled) setLocation(coords);
      })
      .catch(() => {
        // Permission denied or unavailable -- fine, just no auto-detected location.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LocationContext.Provider value={{ location, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within a LocationProvider");
  return ctx;
}

export type LatLng = { lat: number; lng: number };

export function getCurrentLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation isn't available in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error("Couldn't read your location.")),
      // Without enableHighAccuracy, browsers are free to answer from coarse
      // WiFi/cell-tower positioning (often off by hundreds of meters to a
      // few km) instead of GPS -- that's why two phones standing in the same
      // spot could report different coordinates. maximumAge: 0 also refuses
      // a stale cached fix from earlier/elsewhere on the device.
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

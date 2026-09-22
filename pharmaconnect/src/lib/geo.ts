/** Coordinate guards — Leaflet throws "Invalid LatLng object: (NaN, NaN)" on
 *  non-finite values and (via the root ErrorBoundary) takes down the whole
 *  page. Every coordinate entering the map must pass through here. */

export interface LatLng {
  lat: number;
  lng: number;
}

export const FALLBACK_CENTER: LatLng = { lat: 27.7041, lng: 85.3145 }; // Kathmandu

export function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function isValidLocation(loc: unknown): loc is LatLng {
  if (!loc || typeof loc !== "object") return false;
  const { lat, lng } = loc as { lat: unknown; lng: unknown };
  return isValidLatLng(lat, lng);
}

/** Return the location if valid, otherwise the Kathmandu fallback. Never throws. */
export function safeCenter(loc: unknown): LatLng {
  return isValidLocation(loc) ? (loc as LatLng) : FALLBACK_CENTER;
}

/** Drop entries with unusable coordinates so one bad row can't break the map. */
export function filterValidPharmacies<T extends { latitude: unknown; longitude: unknown }>(
  rows: T[]
): T[] {
  return rows.filter((r) => isValidLatLng(r.latitude, r.longitude));
}

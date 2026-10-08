/**
 * Major Nepal urban centres, used to group pharmacies into browsable "city"
 * pages from the only location data we have: a free-text address and a pin.
 *
 * This is deliberately approximate and honest — assignment is by an address
 * keyword first, then nearest centre within a radius, and anything beyond that
 * is left ungrouped rather than mislabelled. See `findCity`.
 */

export interface City {
  name: string;
  slug: string;
  lat: number;
  lng: number;
  /** Lowercase substrings that mark the city inside a free-text address. */
  aliases: string[];
}

/** Approximate centroids. Good enough for region grouping, not for routing. */
export const NEPAL_CITIES: City[] = [
  { name: "Kathmandu", slug: "kathmandu", lat: 27.7172, lng: 85.324, aliases: ["kathmandu", "ktm"] },
  { name: "Lalitpur", slug: "lalitpur", lat: 27.6588, lng: 85.3247, aliases: ["lalitpur", "patan"] },
  { name: "Bhaktapur", slug: "bhaktapur", lat: 27.671, lng: 85.4298, aliases: ["bhaktapur", "bhadgaun"] },
  { name: "Pokhara", slug: "pokhara", lat: 28.2096, lng: 83.9856, aliases: ["pokhara"] },
  { name: "Chitwan", slug: "chitwan", lat: 27.5291, lng: 84.3542, aliases: ["chitwan", "bharatpur", "narayangarh"] },
  { name: "Biratnagar", slug: "biratnagar", lat: 26.4525, lng: 87.2718, aliases: ["biratnagar"] },
  { name: "Birgunj", slug: "birgunj", lat: 27.0104, lng: 84.8772, aliases: ["birgunj"] },
  { name: "Butwal", slug: "butwal", lat: 27.7, lng: 83.45, aliases: ["butwal"] },
  { name: "Dharan", slug: "dharan", lat: 26.8065, lng: 87.2847, aliases: ["dharan"] },
  { name: "Itahari", slug: "itahari", lat: 26.663, lng: 87.273, aliases: ["itahari"] },
  { name: "Nepalgunj", slug: "nepalgunj", lat: 28.05, lng: 81.6167, aliases: ["nepalgunj", "nepalgunj"] },
  { name: "Dhangadhi", slug: "dhangadhi", lat: 28.7, lng: 80.6, aliases: ["dhangadhi", "attariya"] },
  { name: "Birendranagar", slug: "birendranagar", lat: 28.6, lng: 81.633, aliases: ["birendranagar", "surkhet"] },
  { name: "Janakpur", slug: "janakpur", lat: 26.728, lng: 85.924, aliases: ["janakpur"] },
  { name: "Hetauda", slug: "hetauda", lat: 27.428, lng: 85.032, aliases: ["hetauda"] },
  { name: "Rajbiraj", slug: "rajbiraj", lat: 26.54, lng: 86.75, aliases: ["rajbiraj"] },
  { name: "Lahan", slug: "lahan", lat: 26.65, lng: 86.433, aliases: ["lahan"] },
  { name: "Baglung", slug: "baglung", lat: 28.2667, lng: 83.6, aliases: ["baglung"] },
  { name: "Tansen", slug: "tansen", lat: 27.867, lng: 83.55, aliases: ["tansen", "palpa"] },
  { name: "Ghorahi", slug: "ghorahi", lat: 28.038, lng: 82.484, aliases: ["ghorahi"] },
  { name: "Tulsipur", slug: "tulsipur", lat: 28.1167, lng: 82.296, aliases: ["tulsipur"] },
  { name: "Damak", slug: "damak", lat: 26.66, lng: 87.7, aliases: ["damak"] },
];

/** Great-circle distance in km. Good enough for a nearest-city comparison. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

const ALIAS_MATCH_RADIUS_KM = 40;

/**
 * Best-effort city for a pharmacy pin.
 *
 * 1. A known city name in the address string wins — that is what the owner typed.
 * 2. Otherwise the nearest major centre within {@link ALIAS_MATCH_RADIUS_KM}.
 * 3. Otherwise null (left ungrouped), so we never mislabel a remote counter.
 */
export function findCity(address: string | null | undefined, lat: number, lng: number): City | null {
  const haystack = (address ?? "").toLowerCase();
  if (haystack) {
    for (const city of NEPAL_CITIES) {
      for (const alias of city.aliases) {
        if (haystack.includes(alias)) return city;
      }
    }
  }
  let best: City | null = null;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const city of NEPAL_CITIES) {
    const km = haversineKm(lat, lng, city.lat, city.lng);
    if (km < bestKm) {
      bestKm = km;
      best = city;
    }
  }
  return bestKm <= ALIAS_MATCH_RADIUS_KM ? best : null;
}

/** Look up a city by its route slug (for `/pharmacies/in/[city]`). */
export function cityBySlug(slug: string): City | null {
  return NEPAL_CITIES.find((c) => c.slug === slug) ?? null;
}

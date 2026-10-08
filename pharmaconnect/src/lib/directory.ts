import { prisma } from "@/lib/prisma";
import { findCity } from "@/lib/nepalPlaces";

/** A verified pharmacy, with its representative branch resolved and a city tag. */
export interface DirectoryEntry {
  id: string;
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  verified: boolean;
  plan: "FREE" | "VERIFIED" | "FEATURED";
  citySlug: string;
  cityName: string;
  since: string;
}

export interface CityGroup {
  slug: string;
  name: string;
  count: number;
}

/**
 * Verified pharmacies for the public directory.
 *
 * Reads directly from Prisma (server-only) like `/medicines` does — there is no
 * public "list all pharmacies" API, and building the directory as a server
 * component keeps it indexable and revalidated without touching that boundary.
 *
 * Returns `null` only when the database is unreachable, so the page can tell
 * "empty" (`[]`) apart from "unavailable" (`null`) — the same distinction the
 * medicines index makes.
 */
export async function getVerifiedPharmacies(): Promise<DirectoryEntry[] | null> {
  try {
    const rows = await prisma.pharmacy.findMany({
      where: { verified: true },
      // Featured first, then Verified, then Free — enum order is FREE<VERIFIED<FEATURED.
      orderBy: [{ plan: "desc" }, { createdAt: "desc" }],
      take: 500,
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        latitude: true,
        longitude: true,
        verified: true,
        plan: true,
        createdAt: true,
        locations: {
          where: { isPrimary: true },
          take: 1,
          select: { address: true, phone: true, latitude: true, longitude: true },
        },
      },
    });

    return rows.map((p) => {
      const branch = p.locations[0];
      const lat = branch?.latitude ?? p.latitude;
      const lng = branch?.longitude ?? p.longitude;
      const address = branch?.address ?? p.address;
      const phone = branch?.phone ?? p.phone;
      const city = findCity(address, lat, lng);
      return {
        id: p.id,
        name: p.name,
        address,
        phone,
        lat,
        lng,
        verified: p.verified,
        plan: p.plan,
        citySlug: city?.slug ?? "other",
        cityName: city?.name ?? "",
        since: p.createdAt.toISOString(),
      };
    });
  } catch {
    return null;
  }
}

/** Cities that actually have verified pharmacies, most-populated first. */
export function groupByCity(entries: DirectoryEntry[]): CityGroup[] {
  const map = new Map<string, CityGroup>();
  for (const entry of entries) {
    if (entry.citySlug === "other") continue;
    const current = map.get(entry.citySlug) ?? { slug: entry.citySlug, name: entry.cityName, count: 0 };
    current.count += 1;
    map.set(entry.citySlug, current);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

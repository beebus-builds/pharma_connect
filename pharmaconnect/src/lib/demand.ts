/**
 * Search demand signals (SPECS 4B).
 *
 * Privacy stance, which the Privacy page now states: rows carry coordinates and
 * a medicine, never a user id. Nothing here is ever joined back to a patient, and
 * the analytics API only returns aggregates. That is what makes it safe to record
 * at all — the whole feature depends on it.
 */

import { prisma } from "@/lib/prisma";
import { boundingBoxForRadius } from "@/lib/geo";
import { haversineDistanceKm } from "@/lib/utils";
type LoggedQuery = {
  medicineId?: string | null;
  latitude: number;
  longitude: number;
  found: boolean;
  query?: string | null;
};

/**
 * Fire-and-forget. A failed demand write must never fail the patient's search, so
 * errors are swallowed after logging.
 */
export async function recordSearch({ medicineId, latitude, longitude, found, query }: LoggedQuery): Promise<void> {
  try {
    await prisma.searchLog.create({
      data: {
        query: (query ?? medicineId ?? "nearby").slice(0, 120),
        medicineId: medicineId ?? null,
        latitude,
        longitude,
        outcome: found ? "RESOLVED" : "UNRESOLVED",
      },
    });
  } catch (error) {
    console.error("[demand] failed to record search:", error);
  }
}

export type MissedDemand = {
  medicineId: string;
  genericName: string;
  /** Distinct search terms people used for this medicine. */
  queries: string[];
  searches: number;
  /** How many of those searches ended with a pharmacy in range having it. */
  resolved: number;
  lastSearchedAt: string;
  /** Set when this pharmacy already stocks it, so the UI can suggest a refill. */
  yourQuantity: number | null;
};

export type DemandReport = {
  windowDays: number;
  radiusKm: number;
  missed: MissedDemand[];
  totalUnresolved: number;
};

/**
 * "12 people searched X near you while you were out of stock."
 *
 * Reads UNRESOLVED searches in the window, keeps the ones inside the radius
 * (bounding box in SQL, exact Haversine in JS so the edge of the circle is
 * correct), then ranks by volume. Only a pharmacy's own neighbourhood is ever
 * queried, and the result is anonymous counts.
 */
export async function missedDemandReport(options: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  windowDays?: number;
  /** Quantity the pharmacy currently holds, keyed by medicineId. */
  yourStock?: Map<string, number>;
  limit?: number;
  now?: Date;
}): Promise<DemandReport> {
  const windowDays = options.windowDays ?? 7;
  const limit = options.limit ?? 5;
  const now = options.now ?? new Date();
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const box = boundingBoxForRadius(options.latitude, options.longitude, options.radiusKm);

  const grouped = await prisma.searchLog.groupBy({
    by: ["medicineId", "outcome"],
    where: {
      createdAt: { gte: since },
      medicineId: { not: null },
      latitude: { gte: box.minLat, lte: box.maxLat },
      longitude: { gte: box.minLng, lte: box.maxLng },
    },
    _count: { _all: true },
  });

  const counts = new Map<string, { unresolved: number; resolved: number }>();
  for (const row of grouped) {
    if (!row.medicineId) continue;
    const entry = counts.get(row.medicineId) ?? { unresolved: 0, resolved: 0 };
    if (row.outcome === "UNRESOLVED") entry.unresolved += row._count._all;
    else entry.resolved += row._count._all;
    counts.set(row.medicineId, entry);
  }
  if (counts.size === 0) {
    return { windowDays, radiusKm: options.radiusKm, missed: [], totalUnresolved: 0 };
  }

  // The bounding box includes corners outside the circle, so re-filter exactly.
  const recent = await prisma.searchLog.findMany({
    where: {
      createdAt: { gte: since },
      medicineId: { in: [...counts.keys()] },
      latitude: { gte: box.minLat, lte: box.maxLat },
      longitude: { gte: box.minLng, lte: box.maxLng },
    },
    select: { medicineId: true, latitude: true, longitude: true, outcome: true, query: true, createdAt: true },
  });

  const exact = new Map<string, { unresolved: number; resolved: number; queries: Set<string>; last: Date }>();
  for (const row of recent) {
    if (!row.medicineId) continue;
    const distance = haversineDistanceKm(options.latitude, options.longitude, row.latitude, row.longitude);
    if (distance > options.radiusKm) continue;
    const entry = exact.get(row.medicineId) ?? {
      unresolved: 0,
      resolved: 0,
      queries: new Set<string>(),
      last: new Date(0),
    };
    if (row.outcome === "UNRESOLVED") {
      entry.unresolved += 1;
      if (row.query.trim()) entry.queries.add(row.query.trim());
    } else {
      entry.resolved += 1;
    }
    if (row.createdAt > entry.last) entry.last = row.createdAt;
    exact.set(row.medicineId, entry);
  }

  const ranked = [...exact.entries()]
    .filter(([, value]) => value.unresolved > 0)
    .sort((a, b) => b[1].unresolved - a[1].unresolved || b[1].last.getTime() - a[1].last.getTime())
    .slice(0, limit);

  const medicineIds = ranked.map(([id]) => id);
  const medicines = await prisma.medicine.findMany({
    where: { id: { in: medicineIds } },
    select: { id: true, genericName: true },
  });
  const names = new Map(medicines.map((m) => [m.id, m.genericName]));

  const missed: MissedDemand[] = ranked.map(([medicineId, value]) => ({
    medicineId,
    genericName: names.get(medicineId) ?? "Unknown",
    queries: [...value.queries].slice(0, 5),
    searches: value.unresolved,
    resolved: value.resolved,
    lastSearchedAt: value.last.toISOString(),
    yourQuantity: options.yourStock?.get(medicineId) ?? null,
  }));

  return {
    windowDays,
    radiusKm: options.radiusKm,
    missed,
    totalUnresolved: [...exact.values()].reduce((n, v) => n + v.unresolved, 0),
  };
}

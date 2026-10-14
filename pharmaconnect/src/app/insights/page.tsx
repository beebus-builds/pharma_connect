import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { NEPAL_CITIES, findCity } from "@/lib/nepalPlaces";
import InsightsView from "./InsightsView";

export const metadata: Metadata = {
  title: "Network insights | PharmaConnect",
  description:
    "Aggregated, anonymous statistics about the PharmaConnect network: verified pharmacies, catalog, stock coverage and request demand.",
  alternates: { canonical: "/insights" },
  openGraph: { title: "Network insights | PharmaConnect", description: "Aggregated, privacy-safe network statistics." },
};

export const revalidate = 300;

export default async function InsightsPage() {
  const [
    pharmacyCount,
    verifiedPharmacyCount,
    medicineCount,
    userCount,
    patientCount,
    pharmacyAccountCount,
    requestCount,
    openReportsCount,
    stockCount,
  ] = await Promise.all([
    prisma.pharmacy.count(),
    prisma.pharmacy.count({ where: { verified: true } }),
    prisma.medicine.count(),
    prisma.user.count(),
    prisma.user.count({ where: { role: "PATIENT" } }),
    prisma.user.count({ where: { role: "PHARMACY" } }),
    prisma.request.count(),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.pharmacyStock.count(),
  ]).catch(() => [0, 0, 0, 0, 0, 0, 0, 0, 0]);

  // Coverage by city (verified pharmacies only, null coord fallback).
  const verified = await prisma.pharmacy
    .findMany({ where: { verified: true }, select: { latitude: true, longitude: true, address: true } })
    .catch(() => []);
  const coverageMap = new Map<string, { name: string; count: number }>();
  for (const p of verified) {
    const city = findCity(p.address as any, p.latitude as any, p.longitude as any);
    if (!city) continue;
    if (!coverageMap.has(city.slug)) coverageMap.set(city.slug, { name: city.name, count: 0 });
    coverageMap.get(city.slug)!.count += 1;
  }
  const coverage = Array.from(coverageMap.values()).sort((a, b) => b.count - a.count);

  // Top requested medicines (aggregate, anonymous).
  let topRequested: { genericName: string; count: number }[] = [];
  try {
    const rows = await prisma.request.groupBy({
      by: ["medicineId"],
      _count: { medicineId: true },
      orderBy: { _count: { medicineId: "desc" } },
      take: 8,
    });
    const ids = rows.map((r) => r.medicineId);
    const meds = await prisma.medicine.findMany({ where: { id: { in: ids } }, select: { id: true, genericName: true } });
    const nameById = new Map(meds.map((m) => [m.id, m.genericName]));
    topRequested = rows.map((r) => ({
      genericName: nameById.get(r.medicineId) ?? "Unknown",
      count: r._count.medicineId,
    }));
  } catch {
    topRequested = [];
  }

  return (
    <InsightsView
      stats={{
        pharmacyCount,
        verifiedPharmacyCount,
        medicineCount,
        userCount,
        patientCount,
        pharmacyAccountCount,
        requestCount,
        openReportsCount,
        stockCount,
      }}
      coverage={coverage}
      topRequested={topRequested}
    />
  );
}

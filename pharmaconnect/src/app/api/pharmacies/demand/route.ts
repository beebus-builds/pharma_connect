import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { missedDemandReport } from "@/lib/demand";
import { effectivePlan } from "@/lib/plans";

/**
 * SPECS 4B: "12 people searched X near you while you were out of stock."
 *
 * Aggregates only — no patient is identifiable from this response. Gated behind
 * the FEATURED plan, which is what that plan is sold on.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
      return NextResponse.json({ error: "Only pharmacy accounts can view demand" }, { status: 403 });
    }

    const params = new URL(req.url).searchParams;
    const windowDays = Math.min(Math.max(Number(params.get("windowDays")) || 7, 1), 90);
    const radiusKm = Math.min(Math.max(Number(params.get("radiusKm")) || 5, 1), 50);

    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: session.user.pharmacyId },
      select: {
        plan: true,
        planExpiresAt: true,
        locations: { select: { id: true, latitude: true, longitude: true, isPrimary: true } },
      },
    });
    if (!pharmacy) return NextResponse.json({ error: "Pharmacy not found" }, { status: 404 });

    if (effectivePlan(pharmacy.plan, pharmacy.planExpiresAt) !== "FEATURED") {
      return NextResponse.json(
        { error: "The missed-demand inbox is part of the Top placement plan", upgrade: "FEATURED" },
        { status: 403 }
      );
    }

    if (pharmacy.locations.length === 0) {
      return NextResponse.json({ windowDays, radiusKm, missed: [], totalUnresolved: 0 });
    }

    // Demand is reported per branch, since stock and pin are per branch.
    const yourStock = await prisma.pharmacyStock.groupBy({
      by: ["locationId", "medicineId"],
      where: {
        locationId: { in: pharmacy.locations.map((l) => l.id) },
        quantity: { gt: 0 },
      },
      _sum: { quantity: true },
    });
    const stockByLocation = new Map<string, Map<string, number>>();
    for (const row of yourStock) {
      if (!row.medicineId) continue;
      const forLocation = stockByLocation.get(row.locationId) ?? new Map<string, number>();
      forLocation.set(row.medicineId, row._sum.quantity ?? 0);
      stockByLocation.set(row.locationId, forLocation);
    }

    const reports = await Promise.all(
      pharmacy.locations.map(async (location) => ({
        location: { id: location.id, latitude: location.latitude, longitude: location.longitude, isPrimary: location.isPrimary },
        report: await missedDemandReport({
          latitude: location.latitude,
          longitude: location.longitude,
          radiusKm,
          windowDays,
          yourStock: stockByLocation.get(location.id),
        }),
      }))
    );

    const merged = reports
      .flatMap((r) => r.report.missed.map((m) => ({ ...m, locationId: r.location.id })))
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 5);

    return NextResponse.json({
      windowDays,
      radiusKm,
      missed: merged,
      totalUnresolved: reports.reduce((n, r) => n + r.report.totalUnresolved, 0),
      branches: reports.map((r) => ({
        locationId: r.location.id,
        latitude: r.location.latitude,
        longitude: r.location.longitude,
        isPrimary: r.location.isPrimary,
        totalUnresolved: r.report.totalUnresolved,
      })),
    });
  } catch (error) {
    console.error("Demand report error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

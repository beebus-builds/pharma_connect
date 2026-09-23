import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Public trust-bar counts. No auth, cached 60s via fetch cache. */
export async function GET() {
  try {
    const [verifiedPharmacies, medicineCount] = await Promise.all([
      prisma.pharmacy.count({ where: { verified: true } }),
      prisma.medicine.count(),
    ]);
    return NextResponse.json(
      { verifiedPharmacies, medicineCount },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch (error) {
    console.error("Public stats error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

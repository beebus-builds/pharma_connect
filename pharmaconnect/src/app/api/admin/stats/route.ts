import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [pharmacyCount, medicineCount, userCount, pendingVerification, openReports] = await Promise.all([
      prisma.pharmacy.count(),
      prisma.medicine.count(),
      prisma.user.count(),
      prisma.pharmacy.count({ where: { verified: false } }),
      prisma.report.count({ where: { status: "OPEN" } }),
    ]);

    return NextResponse.json({
      pharmacyCount,
      medicineCount,
      userCount,
      pendingVerification,
      openReports,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

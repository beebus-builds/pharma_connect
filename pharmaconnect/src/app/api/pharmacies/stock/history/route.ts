import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Audit trail of the pharmacy's stock changes (newest first). */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const medicineId = searchParams.get("medicineId") || undefined;
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10) || 50, 1), 100);

  const history = await prisma.stockHistory.findMany({
    where: { pharmacyId: session.user.pharmacyId, ...(medicineId ? { medicineId } : {}) },
    include: {
      medicine: {
        select: { id: true, genericName: true, brandName: true, strength: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ history });
}

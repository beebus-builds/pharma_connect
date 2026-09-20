import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function requireAdmin(session: any) {
  return !!session?.user && session.user.role === "ADMIN";
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!requireAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const status = new URL(req.url).searchParams.get("status") ?? "pending";
    const pharmacies = await prisma.pharmacy.findMany({
      where: status === "verified" ? { verified: true } : status === "all" ? {} : { verified: false },
      include: {
        user: { select: { email: true } },
        _count: { select: { reports: { where: { status: "OPEN" } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      pharmacies: pharmacies.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        phone: p.phone,
        email: p.user.email,
        licenseNumber: p.licenseNumber,
        latitude: p.latitude,
        longitude: p.longitude,
        verified: p.verified,
        openReports: p._count.reports,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("Admin pharmacies error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

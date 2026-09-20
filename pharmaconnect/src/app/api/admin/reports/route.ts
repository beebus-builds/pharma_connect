import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUSES = ["OPEN", "RESOLVED", "DISMISSED"] as const;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const status = new URL(req.url).searchParams.get("status") ?? "OPEN";
    const reports = await prisma.report.findMany({
      where: STATUSES.includes(status as any) ? { status: status as any } : {},
      include: {
        pharmacy: { select: { id: true, name: true, address: true } },
        reporter: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r.id,
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.createdAt,
        pharmacy: r.pharmacy,
        reporterEmail: r.reporter.email,
      })),
    });
  } catch (error) {
    console.error("Admin reports error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

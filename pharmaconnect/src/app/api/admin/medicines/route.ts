import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

function requireAdmin(session: any) {
  return !!session?.user && session.user.role === "ADMIN";
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!requireAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = new URL(req.url).searchParams;
    const q = (params.get("q") ?? "").trim();
    const limit = Math.min(Math.max(Number(params.get("limit")) || 25, 1), 100);
    const page = Math.max(Number(params.get("page")) || 1, 1);

    const where = q
      ? {
          OR: [
            { genericName: { contains: q, mode: "insensitive" as const } },
            { brandName: { contains: q, mode: "insensitive" as const } },
            { manufacturer: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [total, medicines] = await Promise.all([
      prisma.medicine.count({ where }),
      prisma.medicine.findMany({
        where,
        orderBy: [{ genericName: "asc" }, { brandName: "asc" }, { strength: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { stocks: true, requests: true } } },
      }),
    ]);

    return NextResponse.json({
      medicines: medicines.map((m) => ({
        id: m.id,
        genericName: m.genericName,
        brandName: m.brandName,
        strength: m.strength,
        manufacturer: m.manufacturer,
        stockCount: m._count.stocks,
        requestCount: m._count.requests,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (error) {
    console.error("Admin medicines list error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

/** Bulk delete. Refuses to remove medicines that pharmacies still reference. */
export async function DELETE(req: NextRequest) {
  const limited = await rateLimit(req, 10, 60_000);
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    if (!requireAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const ids: unknown = body?.ids;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
      return NextResponse.json({ error: "Provide 1-100 medicine ids" }, { status: 400 });
    }
    const cleanIds = ids.filter((id): id is string => typeof id === "string" && id.length > 0);

    const inUse = await prisma.medicine.findMany({
      where: { id: { in: cleanIds }, stocks: { some: {} } },
      select: { id: true, genericName: true, brandName: true },
    });
    if (inUse.length > 0) {
      return NextResponse.json(
        {
          error: "Some medicines are still stocked by a pharmacy. Remove that stock first.",
          blocked: inUse.map((m) => `${m.genericName} (${m.brandName})`),
        },
        { status: 409 }
      );
    }

    const result = await prisma.medicine.deleteMany({ where: { id: { in: cleanIds } } });
    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("Admin medicines delete error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { medicineSearchSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";
import { decodeCursor, encodeCursor } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 30, 60000);
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const parsed = medicineSearchSchema.safeParse({
      q: searchParams.get("q") ?? "",
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid search parameters", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { q, limit, cursor } = parsed.data;
    const normalizedQuery = q.trim().toLowerCase();
    const cursorPayload = cursor ? decodeCursor(cursor) : null;
    const validCursor =
      cursorPayload &&
      cursorPayload.kind === "medicines" &&
      cursorPayload.query === normalizedQuery &&
      typeof cursorPayload.id === "string";

    if (cursor && !validCursor) {
      return NextResponse.json({ error: "Invalid search cursor" }, { status: 400 });
    }

    const medicines = await prisma.medicine.findMany({
      where: {
        OR: [
          { genericName: { contains: normalizedQuery, mode: "insensitive" } },
          { brandName: { contains: normalizedQuery, mode: "insensitive" } },
        ],
      },
      orderBy: [{ genericName: "asc" }, { id: "asc" }],
      take: limit + 1,
      ...(validCursor ? { cursor: { id: cursorPayload.id as string }, skip: 1 } : {}),
    });

    const hasMore = medicines.length > limit;
    const page = hasMore ? medicines.slice(0, limit) : medicines;
    const last = page.at(-1);
    const nextCursor =
      hasMore && last
        ? encodeCursor({ kind: "medicines", query: normalizedQuery, id: last.id })
        : null;

    return NextResponse.json({
      medicines: page,
      pagination: { limit, hasMore, nextCursor },
    });
  } catch (error) {
    console.error("Medicine search error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

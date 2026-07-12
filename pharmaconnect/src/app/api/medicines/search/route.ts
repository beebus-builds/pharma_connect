import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { medicineSearchSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = medicineSearchSchema.safeParse({ q: searchParams.get("q") ?? "" });

    if (!parsed.success) {
      return NextResponse.json({ error: "A search query 'q' is required" }, { status: 400 });
    }

    const { q } = parsed.data;

    const medicines = await prisma.medicine.findMany({
      where: {
        OR: [
          { genericName: { contains: q, mode: "insensitive" } },
          { brandName: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: [{ genericName: "asc" }],
      take: 15,
    });

    return NextResponse.json({ medicines });
  } catch (error) {
    console.error("Medicine search error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

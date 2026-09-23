import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { medicineCreateSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";

/**
 * Add a medicine to the shared catalog. Pharmacies use this when the product
 * they stock isn't found in search — the "can't add my product" fix.
 * Duplicate (generic + brand + strength + manufacturer) returns the existing row.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 20, 60_000);
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "PHARMACY" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Only pharmacies can add products" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = medicineCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { genericName, brandName, strength, manufacturer } = parsed.data;

    const existing = await prisma.medicine.findFirst({
      where: {
        genericName: { equals: genericName, mode: "insensitive" },
        brandName: { equals: brandName, mode: "insensitive" },
        strength: { equals: strength, mode: "insensitive" },
        manufacturer: { equals: manufacturer, mode: "insensitive" },
      },
    });
    if (existing) {
      return NextResponse.json(
        { medicine: existing, message: "This product already exists — selected it for you." },
        { status: 200 }
      );
    }

    const medicine = await prisma.medicine.create({
      data: { genericName, brandName, strength, manufacturer },
    });
    return NextResponse.json({ medicine, message: "Product added to catalog." }, { status: 201 });
  } catch (error) {
    console.error("[medicines] create error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

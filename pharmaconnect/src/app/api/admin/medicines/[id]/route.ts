import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { medicineCreateSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = medicineCreateSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const existing = await prisma.medicine.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Medicine not found" }, { status: 404 });

    const medicine = await prisma.medicine.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ medicine });
  } catch (error) {
    console.error("Admin medicine update error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, 10, 60_000);
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const stockCount = await prisma.pharmacyStock.count({ where: { medicineId: id } });
    if (stockCount > 0) {
      return NextResponse.json(
        { error: "This medicine is still stocked by at least one pharmacy. Remove that stock first." },
        { status: 409 }
      );
    }

    await prisma.medicine.delete({ where: { id } });
    return NextResponse.json({ deleted: 1 });
  } catch (error) {
    console.error("Admin medicine delete error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

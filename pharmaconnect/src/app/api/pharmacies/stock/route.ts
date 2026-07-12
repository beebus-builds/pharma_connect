import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stockUpsertSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stocks = await prisma.pharmacyStock.findMany({
    where: { pharmacyId: session.user.pharmacyId },
    include: { medicine: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ stocks });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = stockUpsertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { medicineId, quantity } = parsed.data;
    const pharmacyId = session.user.pharmacyId;

    const medicine = await prisma.medicine.findUnique({ where: { id: medicineId } });
    if (!medicine) {
      return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
    }

    const stock = await prisma.$transaction(async (tx) => {
      return tx.pharmacyStock.upsert({
        where: { pharmacyId_medicineId: { pharmacyId, medicineId } },
        update: { quantity },
        create: { pharmacyId, medicineId, quantity },
        include: { medicine: true },
      });
    });

    return NextResponse.json({ stock }, { status: 200 });
  } catch (error) {
    console.error("Stock upsert error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reminderCreateSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reminders = await prisma.reminder.findMany({
    where: { userId: session.user.id },
    include: { medicine: { select: { id: true, genericName: true, brandName: true, strength: true } } },
    orderBy: { nextDue: "asc" },
  });

  return NextResponse.json({ reminders });
}

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 20, 60000);
    if (limited) return limited;

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PATIENT") {
      return NextResponse.json({ error: "Only patients can manage reminders" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = reminderCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { medicineId, daysSupply, leadDays } = parsed.data;
    const medicine = await prisma.medicine.findUnique({ where: { id: medicineId } });
    if (!medicine) return NextResponse.json({ error: "Medicine not found" }, { status: 404 });

    const nextDue = new Date(Date.now() + daysSupply * 24 * 60 * 60 * 1000);

    const reminder = await prisma.reminder.upsert({
      where: { userId_medicineId: { userId: session.user.id, medicineId } },
      update: { daysSupply, leadDays, active: true, nextDue },
      create: { userId: session.user.id, medicineId, daysSupply, leadDays, nextDue },
      include: { medicine: { select: { id: true, genericName: true, brandName: true, strength: true } } },
    });

    return NextResponse.json({ reminder }, { status: 201 });
  } catch (error) {
    console.error("Create reminder error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

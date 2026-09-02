import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requestCreateSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = session.user.role === "PHARMACY"
    ? await prisma.request.findMany({
        where: { pharmacyId: session.user.pharmacyId ?? "" },
        include: {
          patient: { select: { id: true, name: true, email: true } },
          pharmacy: { select: { id: true, name: true } },
          medicine: { select: { id: true, genericName: true, brandName: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : await prisma.request.findMany({
        where: { patientId: session.user.id },
        include: {
          patient: { select: { id: true, name: true, email: true } },
          pharmacy: { select: { id: true, name: true } },
          medicine: { select: { id: true, genericName: true, brandName: true } },
        },
        orderBy: { createdAt: "desc" },
      });

  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 20, 60000);
    if (limited) return limited;

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PATIENT") {
      return NextResponse.json({ error: "Only patients can create requests" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = requestCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { pharmacyId, medicineId } = parsed.data;

    const [pharmacy, medicine] = await Promise.all([
      prisma.pharmacy.findUnique({ where: { id: pharmacyId } }),
      prisma.medicine.findUnique({ where: { id: medicineId } }),
    ]);

    if (!pharmacy) return NextResponse.json({ error: "Pharmacy not found" }, { status: 404 });
    if (!medicine) return NextResponse.json({ error: "Medicine not found" }, { status: 404 });

    const request = await prisma.request.create({
      data: {
        patientId: session.user.id,
        pharmacyId,
        medicineId,
        status: "PENDING",
      },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        pharmacy: { select: { id: true, name: true } },
        medicine: { select: { id: true, genericName: true, brandName: true } },
      },
    });

    return NextResponse.json({ request }, { status: 201 });
  } catch (error) {
    console.error("Create request error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requestUpdateSchema } from "@/lib/validations";
import { sendEmailInBackground } from "@/lib/mail";
import { requestStatusEmail } from "@/lib/emails";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
      return NextResponse.json({ error: "Only pharmacies can update requests" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = requestUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.request.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (existing.pharmacyId !== session.user.pharmacyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.request.update({
      where: { id },
      data: { status: parsed.data.status },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        pharmacy: { select: { id: true, name: true } },
        medicine: { select: { id: true, genericName: true, brandName: true } },
      },
    });

    // Tell the patient the moment their request is answered.
    if (existing.status !== updated.status) {
      const medicineLabel = `${updated.medicine.genericName} (${updated.medicine.brandName})`;
      const tpl = requestStatusEmail({
        patientName: updated.patient.name,
        pharmacyName: updated.pharmacy.name,
        medicineLabel,
        status: updated.status as "AVAILABLE" | "UNAVAILABLE" | "PENDING",
      });
      sendEmailInBackground({
        to: updated.patient.email,
        subject: tpl.subject,
        text: tpl.text,
        html: tpl.html,
      });
    }

    return NextResponse.json({ request: updated });
  } catch (error) {
    console.error("Update request error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

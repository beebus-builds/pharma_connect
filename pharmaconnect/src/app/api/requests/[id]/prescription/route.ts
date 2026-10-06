import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { deleteStoredPhoto, savePrescriptionPhoto, validatePhotoFile } from "@/lib/photos";

/** Patient attaches a prescription scan to their request (SPECS 5A). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, 10, 60_000);
  if (limited) return limited;

  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PATIENT") {
      return NextResponse.json({ error: "Only patients can attach prescriptions" }, { status: 403 });
    }

    const request = await prisma.request.findUnique({
      where: { id },
      include: { prescription: true },
    });
    if (!request || request.patientId !== session.user.id) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image file attached" }, { status: 400 });
    }
    const fileError = validatePhotoFile(file);
    if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });

    const url = await savePrescriptionPhoto(id, file);
    const previousUrl = request.prescription?.url ?? null;

    const attachment = await prisma.prescriptionAttachment.upsert({
      where: { requestId: id },
      update: { url, review: "PENDING", deletedAt: null },
      create: { requestId: id, url },
    });

    if (previousUrl && previousUrl !== url) await deleteStoredPhoto(previousUrl);

    return NextResponse.json({ prescription: attachment }, { status: 201 });
  } catch (error) {
    console.error("Prescription upload error:", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}

/** Visible to the patient who owns the request, or the pharmacy once approved. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const request = await prisma.request.findUnique({
    where: { id },
    include: { prescription: true },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isPatient = request.patientId === session.user.id;
  const isPharmacy = session.user.role === "PHARMACY" && session.user.pharmacyId === request.pharmacyId;
  const isAdmin = session.user.role === "ADMIN";
  if (!isPatient && !isPharmacy && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const p = request.prescription;
  if (!p) return NextResponse.json({ prescription: null });

  // The pharmacy only sees the image after admin approves the scan.
  if (isPharmacy && p.review !== "APPROVED") {
    return NextResponse.json({ prescription: { ...p, url: null } });
  }
  if (p.review === "DELETED") {
    return NextResponse.json({ prescription: { ...p, url: null } });
  }

  return NextResponse.json({ prescription: p });
}

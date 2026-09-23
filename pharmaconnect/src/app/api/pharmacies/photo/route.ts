import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import {
  deleteStoredPhoto,
  savePharmacyPhoto,
  validatePhotoFile,
  type PhotoKind,
} from "@/lib/photos";

function isPhotoKind(v: unknown): v is PhotoKind {
  return v === "PROFILE" || v === "COVER";
}

/** The pharmacy's own profile + cover photos (for the dashboard manager). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const images = await prisma.pharmacyImage.findMany({
    where: { pharmacyId: session.user.pharmacyId },
  });
  return NextResponse.json({ images });
}

/** Upload (or replace) the pharmacy's profile / cover photo. Multipart: kind, file. */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 10, 60_000);
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
      return NextResponse.json({ error: "Only pharmacies can upload photos" }, { status: 403 });
    }

    const form = await req.formData();
    const kindRaw = form.get("kind");
    const file = form.get("file");

    if (!isPhotoKind(kindRaw)) {
      return NextResponse.json({ error: "kind must be PROFILE or COVER" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image file attached" }, { status: 400 });
    }

    const fileError = validatePhotoFile(file);
    if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });

    const pharmacyId = session.user.pharmacyId;
    const url = await savePharmacyPhoto(pharmacyId, kindRaw, file);

    const previous = await prisma.pharmacyImage.findUnique({
      where: { pharmacyId_kind: { pharmacyId, kind: kindRaw } },
    });

    const image = await prisma.pharmacyImage.upsert({
      where: { pharmacyId_kind: { pharmacyId, kind: kindRaw } },
      update: { url },
      create: { pharmacyId, kind: kindRaw, url },
    });

    // Clean up the replaced file (best-effort, never fails the request).
    if (previous && previous.url !== url) {
      await deleteStoredPhoto(previous.url);
    }

    return NextResponse.json({ image }, { status: 200 });
  } catch (error) {
    console.error("[photo] upload error:", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}

/** Remove the pharmacy's profile / cover photo. */
export async function DELETE(req: NextRequest) {
  const limited = await rateLimit(req, 10, 60_000);
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
      return NextResponse.json({ error: "Only pharmacies can delete photos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const kind = searchParams.get("kind");
    if (!isPhotoKind(kind)) {
      return NextResponse.json({ error: "kind must be PROFILE or COVER" }, { status: 400 });
    }

    const pharmacyId = session.user.pharmacyId;
    const existing = await prisma.pharmacyImage.findUnique({
      where: { pharmacyId_kind: { pharmacyId, kind } },
    });
    if (!existing) return NextResponse.json({ message: "No photo to remove" });

    await prisma.pharmacyImage.delete({ where: { id: existing.id } });
    await deleteStoredPhoto(existing.url);

    return NextResponse.json({ message: "Photo removed" });
  } catch (error) {
    console.error("[photo] delete error:", error);
    return NextResponse.json({ error: "Delete failed. Please try again." }, { status: 500 });
  }
}

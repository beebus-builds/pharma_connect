import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import {
  deleteStoredPhoto,
  saveMedicinePhoto,
  validatePhotoFile,
} from "@/lib/photos";

/** Upload or replace a medicine catalog pack shot. Multipart: file. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(req, 10, 60_000);
  if (limited) return limited;

  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "PHARMACY" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Only pharmacies can upload medicine photos" }, { status: 403 });
    }

    const medicine = await prisma.medicine.findUnique({ where: { id } });
    if (!medicine) return NextResponse.json({ error: "Medicine not found" }, { status: 404 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image file attached" }, { status: 400 });
    }

    const fileError = validatePhotoFile(file);
    if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });

    const url = await saveMedicinePhoto(id, file);
    const previous = (medicine as { imageUrl?: string | null }).imageUrl ?? null;

    const updated = await prisma.medicine.update({
      where: { id },
      data: { imageUrl: url } as never,
    });

    if (previous && previous !== url) {
      await deleteStoredPhoto(previous);
    }

    return NextResponse.json({ medicine: updated }, { status: 200 });
  } catch (error) {
    console.error("[medicine-photo] upload error:", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}

/** Remove a medicine catalog pack shot. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(req, 10, 60_000);
  if (limited) return limited;

  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "PHARMACY" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Only pharmacies can delete medicine photos" }, { status: 403 });
    }

    const medicine = await prisma.medicine.findUnique({ where: { id } });
    if (!medicine) return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
    if (!(medicine as { imageUrl?: string | null }).imageUrl) return NextResponse.json({ message: "No photo to remove" });

    const previous = (medicine as { imageUrl?: string | null }).imageUrl as string;
    const updated = await prisma.medicine.update({
      where: { id },
      data: { imageUrl: null } as never,
    });
    await deleteStoredPhoto(previous);

    return NextResponse.json({ medicine: updated, message: "Photo removed" });
  } catch (error) {
    console.error("[medicine-photo] delete error:", error);
    return NextResponse.json({ error: "Delete failed. Please try again." }, { status: 500 });
  }
}

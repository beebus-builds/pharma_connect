import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteStoredPhoto } from "@/lib/photos";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const review = body?.review;
  if (!["APPROVED", "REJECTED", "DELETED"].includes(review)) {
    return NextResponse.json({ error: "review must be APPROVED, REJECTED or DELETED" }, { status: 400 });
  }

  const existing = await prisma.prescriptionAttachment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.prescriptionAttachment.update({
    where: { id },
    data: {
      review,
      deletedAt: review === "DELETED" ? new Date() : null,
    },
  });

  // Rejected/deleted scans must not linger in storage.
  if (review !== "APPROVED") {
    await deleteStoredPhoto(existing.url);
  }

  return NextResponse.json({ prescription: updated });
}

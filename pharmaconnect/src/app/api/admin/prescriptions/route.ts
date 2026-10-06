import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const REVIEWS = ["PENDING", "APPROVED", "REJECTED", "DELETED"] as const;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const review = new URL(req.url).searchParams.get("review") ?? "PENDING";
  const prescriptions = await prisma.prescriptionAttachment.findMany({
    where: REVIEWS.includes(review as any) ? { review: review as any } : {},
    include: {
      request: {
        select: {
          id: true,
          medicine: { select: { genericName: true, brandName: true } },
          patient: { select: { email: true } },
          pharmacy: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ prescriptions });
}

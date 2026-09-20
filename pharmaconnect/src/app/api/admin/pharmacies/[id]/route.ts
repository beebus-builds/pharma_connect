import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pharmacyVerifySchema } from "@/lib/validations";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = pharmacyVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const pharmacy = await prisma.pharmacy.update({
      where: { id },
      data: {
        verified: parsed.data.verified,
        verifiedAt: parsed.data.verified ? new Date() : null,
      },
    });

    return NextResponse.json({ id: pharmacy.id, verified: pharmacy.verified });
  } catch (error) {
    console.error("Admin verify pharmacy error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

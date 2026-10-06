import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const reminder = await prisma.reminder.findUnique({ where: { id } });
    if (!reminder || reminder.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const update: Record<string, unknown> = {};
    if (typeof body.active === "boolean") update.active = body.active;
    if (typeof body.daysSupply === "number" && body.daysSupply >= 1 && body.daysSupply <= 365) update.daysSupply = body.daysSupply;
    if (typeof body.leadDays === "number" && body.leadDays >= 0 && body.leadDays <= 30) update.leadDays = body.leadDays;

    const updated = await prisma.reminder.update({
      where: { id },
      data: update,
      include: { medicine: { select: { id: true, genericName: true, brandName: true, strength: true } } },
    });

    return NextResponse.json({ reminder: updated });
  } catch (error) {
    console.error("Update reminder error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const reminder = await prisma.reminder.findUnique({ where: { id } });
  if (!reminder || reminder.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.reminder.delete({ where: { id } });
  return NextResponse.json({ message: "Reminder deleted" });
}

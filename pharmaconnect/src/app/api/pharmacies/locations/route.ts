import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { locationCreateSchema, locationUpdateSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";
import { isInNepal } from "@/lib/nepal";

/** SPECS 4C: one login manages N branches. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
      return NextResponse.json({ error: "Only pharmacy accounts can manage branches" }, { status: 403 });
    }

    const locations = await prisma.location.findMany({
      where: { pharmacyId: session.user.pharmacyId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      include: { _count: { select: { stocks: true, requests: true } } },
    });

    return NextResponse.json({
      locations: locations.map((l) => ({
        id: l.id,
        name: l.name,
        address: l.address,
        phone: l.phone,
        latitude: l.latitude,
        longitude: l.longitude,
        isPrimary: l.isPrimary,
        stockLines: l._count.stocks,
        requestCount: l._count.requests,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    console.error("List locations error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 20, 60_000);
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
      return NextResponse.json({ error: "Only pharmacy accounts can manage branches" }, { status: 403 });
    }

    const parsed = locationCreateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { name, address, phone, latitude, longitude, isPrimary } = parsed.data;

    if (!isInNepal(latitude, longitude)) {
      return NextResponse.json(
        { error: "Location must be inside Nepal — pin your exact shop entrance", fieldErrors: { latitude: ["Outside Nepal"] } },
        { status: 400 }
      );
    }

    const pharmacyId = session.user.pharmacyId as string;
    const existingCount = await prisma.location.count({ where: { pharmacyId } });
    if (existingCount >= 20) {
      return NextResponse.json({ error: "You can manage up to 20 branches" }, { status: 400 });
    }

    const location = await prisma.$transaction(async (tx) => {
      // A chain has exactly one primary; making a new branch primary demotes the old one.
      if (isPrimary || existingCount === 0) {
        await tx.location.updateMany({
          where: { pharmacyId },
          data: { isPrimary: false },
        });
      }
      return tx.location.create({
        data: {
          pharmacyId,
          name,
          address,
          phone: phone ?? null,
          latitude,
          longitude,
          isPrimary: isPrimary || existingCount === 0,
        },
      });
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    console.error("Create location error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await rateLimit(req, 30, 60_000);
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
      return NextResponse.json({ error: "Only pharmacy accounts can manage branches" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = locationUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { id, ...changes } = parsed.data;

    const pharmacyId = session.user.pharmacyId as string;
    // Scope the lookup to the caller's own chain so an id from elsewhere 404s.
    const existing = await prisma.location.findFirst({
      where: { id, pharmacyId },
    });
    if (!existing) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

    if (changes.latitude !== undefined && changes.longitude !== undefined) {
      if (!isInNepal(changes.latitude, changes.longitude)) {
        return NextResponse.json(
          { error: "Location must be inside Nepal", fieldErrors: { latitude: ["Outside Nepal"] } },
          { status: 400 }
        );
      }
    }

    const location = await prisma.$transaction(async (tx) => {
      if (changes.isPrimary) {
        await tx.location.updateMany({
          where: { pharmacyId },
          data: { isPrimary: false },
        });
      }
      return tx.location.update({ where: { id }, data: changes });
    });

    return NextResponse.json({ location });
  } catch (error) {
    console.error("Update location error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await rateLimit(req, 10, 60_000);
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
      return NextResponse.json({ error: "Only pharmacy accounts can manage branches" }, { status: 403 });
    }

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Branch id is required" }, { status: 400 });

    const pharmacyId = session.user.pharmacyId as string;
    const existing = await prisma.location.findFirst({
      where: { id, pharmacyId },
      include: { _count: { select: { stocks: true, requests: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

    if (existing._count.stocks > 0 || existing._count.requests > 0) {
      return NextResponse.json(
        {
          error:
            "This branch still has stock listings or patient requests. Clear them before deleting so patient conversations are not orphaned.",
          stockLines: existing._count.stocks,
          requestCount: existing._count.requests,
        },
        { status: 409 }
      );
    }

    const remaining = await prisma.location.count({ where: { pharmacyId } });
    if (remaining <= 1) {
      return NextResponse.json({ error: "A pharmacy must keep at least one branch" }, { status: 400 });
    }

    await prisma.location.delete({ where: { id } });

    // Promote the oldest survivor so the chain always has a primary.
    if (existing.isPrimary) {
      const next = await prisma.location.findFirst({
        where: { pharmacyId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (next) await prisma.location.update({ where: { id: next.id }, data: { isPrimary: true } });
    }

    return NextResponse.json({ deleted: 1 });
  } catch (error) {
    console.error("Delete location error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

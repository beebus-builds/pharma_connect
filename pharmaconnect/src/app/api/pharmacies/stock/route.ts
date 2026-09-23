import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stockUpsertSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";
import { sendEmailInBackground } from "@/lib/mail";
import { lowStockAlertEmail } from "@/lib/emails";
import {
  crossedLowThreshold,
  effectiveThreshold,
  DEFAULT_LOW_STOCK_THRESHOLD,
} from "@/lib/inventory";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stocks = await prisma.pharmacyStock.findMany({
    where: { pharmacyId: session.user.pharmacyId },
    include: { medicine: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ stocks });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 30, 60_000);
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = stockUpsertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { medicineId, quantity, expiryDate, mrp, lowStockThreshold, clearExpiry } = parsed.data;
    const pharmacyId = session.user.pharmacyId;

    const [medicine, existing, pharmacy] = await Promise.all([
      prisma.medicine.findUnique({ where: { id: medicineId } }),
      prisma.pharmacyStock.findUnique({
        where: { pharmacyId_medicineId: { pharmacyId, medicineId } },
      }),
      prisma.pharmacy.findUnique({
        where: { id: pharmacyId },
        include: { user: { select: { email: true } } },
      }),
    ]);
    if (!medicine) {
      return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
    }
    if (!pharmacy) {
      return NextResponse.json({ error: "Pharmacy profile not found" }, { status: 404 });
    }

    const oldQuantity = existing?.quantity ?? 0;
    const threshold = effectiveThreshold(
      lowStockThreshold ?? existing?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD
    );

    // Low-stock email fires once per crossing (above → at/below). Restocking
    // above the threshold resets it so the next dip alerts again.
    const isCrossing =
      existing !== null &&
      crossedLowThreshold(oldQuantity, quantity, threshold) &&
      !existing.lowStockAlertSentAt;
    const recovered = quantity > threshold;
    // A product listed as already-low is "known" — mark it silently so the
    // next dip after a restock still triggers exactly one alert.
    const createdLow = existing === null && quantity <= threshold;

    const stock = await prisma.$transaction(async (tx) => {
      const updated = await tx.pharmacyStock.upsert({
        where: { pharmacyId_medicineId: { pharmacyId, medicineId } },
        update: {
          quantity,
          ...(expiryDate !== undefined ? { expiryDate } : {}),
          ...(clearExpiry ? { expiryDate: null } : {}),
          ...(mrp !== undefined ? { mrp } : {}),
          ...(lowStockThreshold !== undefined ? { lowStockThreshold } : {}),
          ...(isCrossing ? { lowStockAlertSentAt: new Date() } : {}),
          ...(recovered ? { lowStockAlertSentAt: null } : {}),
        },
        create: {
          pharmacyId,
          medicineId,
          quantity,
          expiryDate: expiryDate ?? null,
          mrp: mrp ?? null,
          lowStockThreshold: lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
          ...(createdLow ? { lowStockAlertSentAt: new Date() } : {}),
        },
        include: { medicine: true },
      });

      await tx.stockHistory.create({
        data: {
          pharmacyId,
          medicineId,
          oldQuantity,
          newQuantity: quantity,
          delta: quantity - oldQuantity,
          note: existing ? `SET ${oldQuantity} → ${quantity}` : `ADDED with ${quantity}`,
          createdById: session.user.id,
        },
      });

      return updated;
    });

    if (isCrossing && pharmacy.user?.email) {
      const tpl = lowStockAlertEmail({
        pharmacyName: pharmacy.name,
        medicineLabel: `${medicine.genericName} (${medicine.brandName})`,
        quantity,
        threshold,
      });
      sendEmailInBackground({
        to: pharmacy.user.email,
        subject: tpl.subject,
        text: tpl.text,
        html: tpl.html,
      });
    }

    const expired = stock.expiryDate && stock.expiryDate.getTime() <= Date.now();
    return NextResponse.json(
      {
        stock,
        warnings: expired
          ? ["This batch is expired — it is hidden from patient search until you update the expiry."]
          : [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Stock upsert error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

/** Remove a product from the pharmacy's inventory entirely. */
export async function DELETE(req: NextRequest) {
  const limited = await rateLimit(req, 20, 60_000);
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const medicineId = searchParams.get("medicineId");
    if (!medicineId) {
      return NextResponse.json({ error: "medicineId is required" }, { status: 400 });
    }

    const pharmacyId = session.user.pharmacyId;
    const existing = await prisma.pharmacyStock.findUnique({
      where: { pharmacyId_medicineId: { pharmacyId, medicineId } },
      include: { medicine: { select: { genericName: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Product not found in your inventory" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.stockHistory.create({
        data: {
          pharmacyId,
          medicineId,
          oldQuantity: existing.quantity,
          newQuantity: 0,
          delta: -existing.quantity,
          note: "REMOVED from inventory",
          createdById: session.user.id,
        },
      }),
      prisma.pharmacyStock.delete({ where: { id: existing.id } }),
    ]);

    return NextResponse.json({
      message: `${existing.medicine.genericName} removed from your inventory.`,
    });
  } catch (error) {
    console.error("Stock delete error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

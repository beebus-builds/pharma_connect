import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { initiateKhaltiPayment } from "@/lib/khalti";
import { getPlan, isPlan, PLAN_PERIOD_DAYS } from "@/lib/plans";

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 10, 60_000);
    if (limited) return limited;

    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
      return NextResponse.json({ error: "Only pharmacy accounts can subscribe" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const requested = body?.plan;
    if (!isPlan(requested)) {
      return NextResponse.json({ error: "Choose a valid plan" }, { status: 400 });
    }

    const plan = getPlan(requested);
    if (!plan.paid || plan.pricePaisa <= 0) {
      return NextResponse.json({ error: "That plan does not require payment" }, { status: 400 });
    }

    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: session.user.pharmacyId } });
    if (!pharmacy) return NextResponse.json({ error: "Pharmacy not found" }, { status: 404 });

    // The price is resolved server-side from the catalog above; the client only
    // ever names the plan, so a tampered amount cannot be charged.
    const payment = await prisma.payment.create({
      data: {
        pharmacyId: pharmacy.id,
        purpose: `SUBSCRIPTION:${plan.plan}`,
        amount: plan.pricePaisa,
        status: "PENDING",
      },
    });

    let khalti;
    try {
      khalti = await initiateKhaltiPayment({
        amount: plan.pricePaisa,
        purchaseOrderId: payment.id,
        purchaseOrderName: `PharmaConnect ${plan.label} (${PLAN_PERIOD_DAYS} days)`,
        customerName: pharmacy.name,
        customerEmail: session.user.email ?? undefined,
        customerPhone: pharmacy.phone,
      });
    } catch (err) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      throw err;
    }

    await prisma.payment.update({ where: { id: payment.id }, data: { pidx: khalti.pidx } });

    return NextResponse.json({ paymentUrl: khalti.payment_url, plan: plan.plan, amount: plan.pricePaisa });
  } catch (error) {
    console.error("Khalti initiate error:", error);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { initiateKhaltiPayment, PHARMACY_SUBSCRIPTION_AMOUNT_PAISA } from "@/lib/khalti";

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 10, 60000);
    if (limited) return limited;

    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PHARMACY" || !session.user.pharmacyId) {
      return NextResponse.json({ error: "Only pharmacy accounts can subscribe" }, { status: 403 });
    }

    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: session.user.pharmacyId } });
    if (!pharmacy) return NextResponse.json({ error: "Pharmacy not found" }, { status: 404 });

    const payment = await prisma.payment.create({
      data: {
        pharmacyId: pharmacy.id,
        purpose: "SUBSCRIPTION",
        amount: PHARMACY_SUBSCRIPTION_AMOUNT_PAISA,
        status: "PENDING",
      },
    });

    let khalti;
    try {
      khalti = await initiateKhaltiPayment({
        amount: PHARMACY_SUBSCRIPTION_AMOUNT_PAISA,
        purchaseOrderId: payment.id,
        purchaseOrderName: "PharmaConnect pharmacy subscription (30 days)",
        customerName: pharmacy.name,
        customerEmail: session.user.email ?? undefined,
        customerPhone: pharmacy.phone,
      });
    } catch (err) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      throw err;
    }

    await prisma.payment.update({ where: { id: payment.id }, data: { pidx: khalti.pidx } });

    return NextResponse.json({ paymentUrl: khalti.payment_url });
  } catch (error) {
    console.error("Khalti initiate error:", error);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}

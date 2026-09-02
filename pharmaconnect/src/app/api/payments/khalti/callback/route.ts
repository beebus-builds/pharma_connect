import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lookupKhaltiPayment, PHARMACY_SUBSCRIPTION_DAYS } from "@/lib/khalti";

function redirectTo(req: NextRequest, status: "success" | "failed" | "pending") {
  const url = new URL("/dashboard/pharmacy", req.url);
  url.searchParams.set("subscription", status);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pidx = searchParams.get("pidx");
  if (!pidx) return redirectTo(req, "failed");

  const payment = await prisma.payment.findUnique({ where: { pidx } });
  if (!payment) return redirectTo(req, "failed");

  // Never trust query params for payment status — always re-verify server-to-server.
  let lookup;
  try {
    lookup = await lookupKhaltiPayment(pidx);
  } catch (error) {
    console.error("Khalti callback lookup error:", error);
    return redirectTo(req, "pending");
  }

  if (lookup.status === "Completed") {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "COMPLETED", transactionId: lookup.transaction_id },
      }),
      prisma.pharmacy.update({
        where: { id: payment.pharmacyId },
        data: {
          subscriptionActive: true,
          subscriptionExpiresAt: new Date(Date.now() + PHARMACY_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000),
        },
      }),
    ]);
    return redirectTo(req, "success");
  }

  if (lookup.status === "Pending") {
    return redirectTo(req, "pending");
  }

  await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
  return redirectTo(req, "failed");
}

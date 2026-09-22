import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lookupKhaltiPayment, PHARMACY_SUBSCRIPTION_DAYS } from "@/lib/khalti";
import { sendEmailInBackground } from "@/lib/mail";
import { subscriptionReceiptEmail } from "@/lib/emails";

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
    const [updatedPayment, pharmacy] = await prisma.$transaction([
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
        include: { user: { select: { email: true } } },
      }),
    ]);
    if (pharmacy.user?.email) {
      const tpl = subscriptionReceiptEmail({
        pharmacyName: pharmacy.name,
        amount: updatedPayment.amount,
        transactionId: updatedPayment.transactionId,
      });
      sendEmailInBackground({
        to: pharmacy.user.email,
        subject: tpl.subject,
        text: tpl.text,
        html: tpl.html,
      });
    }
    return redirectTo(req, "success");
  }

  if (lookup.status === "Pending") {
    return redirectTo(req, "pending");
  }

  await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
  return redirectTo(req, "failed");
}

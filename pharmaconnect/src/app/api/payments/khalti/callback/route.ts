import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lookupKhaltiPayment } from "@/lib/khalti";
import { sendEmailInBackground } from "@/lib/mail";
import { subscriptionReceiptEmail } from "@/lib/emails";
import { expiryAfterPurchase, getPlan, isPlan, renewalStart, PLAN_PERIOD_DAYS } from "@/lib/plans";

function redirectTo(req: NextRequest, status: "success" | "failed" | "pending") {
  const url = new URL("/dashboard/pharmacy", req.url);
  url.searchParams.set("subscription", status);
  return NextResponse.redirect(url);
}

/** "SUBSCRIPTION:VERIFIED" -> "VERIFIED". Legacy rows stay on the default plan. */
function planFromPurpose(purpose: string): ReturnType<typeof getPlan> {
  const candidate = purpose.split(":")[1];
  return getPlan(isPlan(candidate) ? candidate : "VERIFIED");
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
    const plan = planFromPurpose(payment.purpose);

    // Read-then-write inside one transaction: the renewal base is the pharmacy's
    // plan expiry *now*, so paying early extends instead of discarding paid days,
    // and two concurrent renewals cannot both read the same base.
    const { pharmacy, payment: updatedPayment, expiresAt } = await prisma.$transaction(async (tx) => {
      const current = await tx.pharmacy.findUnique({
        where: { id: payment.pharmacyId },
        select: { planExpiresAt: true },
      });
      const now = new Date();
      const expiresAt = expiryAfterPurchase(renewalStart(current?.planExpiresAt ?? null, now), PLAN_PERIOD_DAYS);

      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: { status: "COMPLETED", transactionId: lookup.transaction_id },
      });
      const updatedPharmacy = await tx.pharmacy.update({
        where: { id: payment.pharmacyId },
        data: { plan: plan.plan, planExpiresAt: expiresAt },
        include: { user: { select: { email: true } } },
      });
      return { pharmacy: updatedPharmacy, payment: updated, expiresAt } as const;
    });

    if (pharmacy.user?.email) {
      const tpl = subscriptionReceiptEmail({
        pharmacyName: pharmacy.name,
        amount: updatedPayment.amount,
        transactionId: updatedPayment.transactionId,
        planLabel: plan.label,
        expiresAt,
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

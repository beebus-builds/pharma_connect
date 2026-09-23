import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reportCreateSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";
import { sendEmailInBackground } from "@/lib/mail";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Please log in to report a listing" }, { status: 401 });
    }
    if (session.user.role !== "PATIENT") {
      return NextResponse.json({ error: "Only patient accounts can file reports" }, { status: 403 });
    }

    const limited = await rateLimit(req, 10, 60000);
    if (limited) return limited;

    const body = await req.json();
    const parsed = reportCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: parsed.data.pharmacyId } });
    if (!pharmacy) {
      return NextResponse.json({ error: "Pharmacy not found" }, { status: 404 });
    }

    const duplicate = await prisma.report.findFirst({
      where: {
        pharmacyId: parsed.data.pharmacyId,
        reporterId: session.user.id,
        reason: parsed.data.reason as any,
        status: "OPEN",
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "You already have an open report for this issue — our team is on it" },
        { status: 409 }
      );
    }

    const report = await prisma.report.create({
      data: {
        pharmacyId: parsed.data.pharmacyId,
        reporterId: session.user.id,
        reason: parsed.data.reason as any,
        details: parsed.data.details ?? null,
      },
    });

    // Optional admin notification (set ADMIN_NOTIFY_EMAIL to enable).
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL?.trim();
    if (adminEmail) {
      sendEmailInBackground({
        to: adminEmail,
        subject: `New ${parsed.data.reason} report for ${pharmacy.name}`,
        text: `A patient reported ${pharmacy.name} (${pharmacy.address}) — reason: ${parsed.data.reason}. Details: ${parsed.data.details ?? "—"}\n\nReview: ${process.env.NEXTAUTH_URL}/admin/reports`,
      });
    }

    return NextResponse.json({ id: report.id, message: "Thanks — our team will review this listing" }, { status: 201 });
  } catch (error) {
    console.error("Create report error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { resendVerificationSchema } from "@/lib/validations";
import { sendEmail } from "@/lib/mail";
import { verificationEmail } from "@/lib/emails";
import { rateLimit } from "@/lib/rateLimit";

/** Re-send verification email. Always returns success to avoid email enumeration. */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 5, 60_000);
  if (limited) return limited;

  try {
    const body = await req.json();
    const parsed = resendVerificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    // Don't leak whether the address exists or is already verified.
    if (!user || user.emailVerified) {
      return NextResponse.json({
        message: "If an unverified account exists for this email, a verification link is on its way.",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const tpl = verificationEmail(user.name, verificationToken);
    await sendEmail({ to: email, subject: tpl.subject, text: tpl.text, html: tpl.html });

    return NextResponse.json({
      message: "If an unverified account exists for this email, a verification link is on its way.",
    });
  } catch (error) {
    console.error("[resend-verification] error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";
import { sendEmail } from "@/lib/mail";
import { passwordResetEmail } from "@/lib/emails";
import { rateLimit } from "@/lib/rateLimit";

/** Request a password-reset email. Always returns success to avoid email enumeration. */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 5, 60_000);
  if (limited) return limited;

  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: token,
          passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 60 min
        },
      });

      const tpl = passwordResetEmail(user.name, token);
      await sendEmail({ to: email, subject: tpl.subject, text: tpl.text, html: tpl.html });
    }

    return NextResponse.json({
      message: "If an account exists for this email, a password-reset link is on its way.",
    });
  } catch (error) {
    console.error("[forgot-password] error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

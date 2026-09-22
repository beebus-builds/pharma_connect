import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmailInBackground } from "@/lib/mail";
import { welcomeEmail } from "@/lib/emails";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    if (
      user.verificationTokenExpires &&
      user.verificationTokenExpires.getTime() < Date.now()
    ) {
      return NextResponse.json(
        { error: "This verification link has expired. Please request a new one from the login page.", expired: true },
        { status: 400 }
      );
    }

    const alreadyVerified = user.emailVerified;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });

    // Onboarding email: drives the user back into the site right after verify.
    if (!alreadyVerified) {
      const tpl = welcomeEmail(user.name, user.role);
      sendEmailInBackground({ to: user.email, subject: tpl.subject, text: tpl.text, html: tpl.html });
    }

    return NextResponse.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

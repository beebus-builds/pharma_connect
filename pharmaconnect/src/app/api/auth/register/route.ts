import { NextRequest, NextResponse, after } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { sendEmail } from "@/lib/mail";
import { verificationEmail } from "@/lib/emails";
import { rateLimit } from "@/lib/rateLimit";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 5, 60000);
    if (limited) return limited;

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const email = data.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        name: data.role === "PHARMACY" ? (data.pharmacyName ?? data.name) : data.name,
        email,
        password: hashedPassword,
        role: data.role,
        verificationToken,
        verificationTokenExpires,
        emailVerified: false,
        pharmacy: data.role === "PHARMACY" ? {
          create: {
            name: data.pharmacyName!,
            address: data.address!,
            phone: data.phone!,
            latitude: data.latitude!,
            longitude: data.longitude!,
            licenseNumber: data.licenseNumber ?? null,
            locations: {
              create: {
                name: "Main branch",
                address: data.address!,
                phone: data.phone!,
                latitude: data.latitude!,
                longitude: data.longitude!,
                isPrimary: true,
              },
            },
          },
        } : undefined,
      },
    });

    const tpl = verificationEmail(user.name, verificationToken);

    // Send after the response is flushed. SMTP can stall for tens of seconds on a
    // bad network; the account already exists, so registration must not block on it.
    // The login page always offers "Resend verification" as the recovery path.
    after(async () => {
      const mailResult = await sendEmail({ to: email, subject: tpl.subject, text: tpl.text, html: tpl.html });
      if (!mailResult.success) {
        console.warn("[register] verification email failed for", email, mailResult.error);
      }
    });

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        message: "Account created! Please check your email to verify your account. If nothing arrives, use 'Resend verification' on the login page.",
        emailSent: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

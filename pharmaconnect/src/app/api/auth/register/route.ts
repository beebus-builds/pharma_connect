import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { sendEmail } from "@/lib/mail";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
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

    const user = await prisma.user.create({
      data: {
        name: data.role === "PHARMACY" ? (data.pharmacyName ?? data.name) : data.name,
        email,
        password: hashedPassword,
        role: data.role,
        verificationToken,
        emailVerified: false,
        pharmacy: data.role === "PHARMACY" ? {
          create: {
            name: data.pharmacyName!,
            address: data.address!,
            phone: data.phone!,
            latitude: data.latitude!,
            longitude: data.longitude!,
            licenseNumber: data.licenseNumber!,
          },
        } : undefined,
      },
    });

    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify?token=${verificationToken}`;

    await sendEmail({
      to: email,
      subject: "Verify your PharmaConnect account",
      text: `Please verify your email by clicking this link: ${verificationUrl}`,
      html: `<p>Welcome to PharmaConnect!</p><p>Please verify your email address by clicking the button below:</p><a href="${verificationUrl}" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:white;text-decoration:none;border-radius:5px;">Verify Email</a>`,
    });

    return NextResponse.json(
      { id: user.id, name: user.name, email: user.email, role: user.role, message: "Account created! Please check your email to verify your account." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

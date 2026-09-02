import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";

/**
 * Credential-validation endpoint.
 *
 * NOTE: The actual browser session/cookie is established by NextAuth's
 * credentials provider (POST /api/auth/callback/credentials, wired up via
 * `signIn("credentials", ...)` on the client - see src/app/(auth)/login/page.tsx).
 * This route is provided for direct API consumers who want to validate
 * credentials and receive the user's role without going through NextAuth.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 5, 60000);
    if (limited) return limited;

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { pharmacy: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      pharmacyId: user.pharmacy?.id ?? null,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

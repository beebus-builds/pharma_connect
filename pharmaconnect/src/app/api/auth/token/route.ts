import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import jwt from "jsonwebtoken";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = process.env.NEXTAUTH_SECRET!;
  const token = jwt.sign(
    {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      pharmacyId: session.user.pharmacyId ?? null,
    },
    secret,
    { expiresIn: "1h" }
  );

  return NextResponse.json({ token });
}

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const ROLES = ["PATIENT", "PHARMACY", "ADMIN"] as const;
type Role = (typeof ROLES)[number];

type WsUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  pharmacyId: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseUser(value: unknown): WsUser | null {
  if (!isRecord(value)) return null;

  const id = typeof value.id === "string" ? value.id : typeof value.sub === "string" ? value.sub : null;
  const role = value.role;
  if (!id || typeof role !== "string" || !ROLES.includes(role as Role) || typeof value.email !== "string") {
    return null;
  }

  const pharmacyId =
    typeof value.pharmacyId === "string" ? value.pharmacyId : value.pharmacyId == null ? null : undefined;
  if (pharmacyId === undefined) return null;

  return {
    id,
    email: value.email,
    name: typeof value.name === "string" ? value.name : "",
    role: role as Role,
    pharmacyId,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (!isRecord(body) || typeof body.token !== "string" || !body.token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) return NextResponse.json({ error: "Authentication is not configured" }, { status: 500 });

    const decoded = jwt.verify(body.token, secret, {
      algorithms: ["HS256"],
      issuer: "pharmaconnect-web",
      audience: "pharmaconnect-realtime",
    });
    const user = parseUser(decoded);
    if (!user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

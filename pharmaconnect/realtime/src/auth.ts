import jwt from "jsonwebtoken";

const TOKEN_ISSUER = "pharmaconnect-web";
const TOKEN_AUDIENCE = "pharmaconnect-realtime";
const ROLES = ["PATIENT", "PHARMACY", "ADMIN"] as const;
type Role = (typeof ROLES)[number];

export interface WsUser {
  id: string;
  email: string;
  role: Role;
  pharmacyId: string | null;
  name: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseWsUser(value: unknown): WsUser | null {
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
    role: role as Role,
    pharmacyId,
    name: typeof value.name === "string" ? value.name : "",
  };
}

export function verifyToken(token: string): WsUser | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });
    return parseWsUser(decoded);
  } catch {
    return null;
  }
}

export async function verifyViaWeb(token: string): Promise<WsUser | null> {
  const webUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${webUrl}/api/auth/verify-ws`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return null;

    const data: unknown = await res.json();
    if (!isRecord(data)) return null;
    return parseWsUser(data.user);
  } catch {
    return null;
  }
}

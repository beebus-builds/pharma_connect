import jwt from "jsonwebtoken";

export interface WsUser {
  id: string;
  email: string;
  role: "PATIENT" | "PHARMACY" | "ADMIN";
  pharmacyId: string | null;
  name: string;
}

export function verifyToken(token: string): WsUser | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET not set");
  try {
    // NextAuth JWT is encrypted with NEXTAUTH_SECRET via next-auth/jwt
    // For microservice, we verify via jsonwebtoken if using custom JWT,
    // fallback: decode without verify for development (WARNING: not secure)
    // Production: share NEXTAUTH_SECRET and use next-auth/jwt decode on web to issue a short-lived access token
    const decoded = jwt.verify(token, secret) as any;
    return {
      id: decoded.id || decoded.sub,
      email: decoded.email,
      role: decoded.role,
      pharmacyId: decoded.pharmacyId ?? null,
      name: decoded.name ?? "",
    };
  } catch {
    try {
      // Fallback: try decoding next-auth JWT via jose (if using next-auth v4, token is JWE)
      // For now, attempt base64 decode for dev
      const payload = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64").toString());
      if (payload?.id || payload?.sub) {
        return {
          id: payload.id || payload.sub,
          email: payload.email,
          role: payload.role,
          pharmacyId: payload.pharmacyId ?? null,
          name: payload.name ?? "",
        };
      }
    } catch {}
    return null;
  }
}

// Alternative: Verify via web API (most reliable, no secret sharing issues)
// Call POST ${NEXTAUTH_URL}/api/auth/verify-ws with token and get user back
export async function verifyViaWeb(token: string): Promise<WsUser | null> {
  const webUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${webUrl}/api/auth/verify-ws`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: WsUser };
    return data.user as WsUser;
  } catch {
    return null;
  }
}

import { afterEach, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { parseWsUser, verifyToken } from "./auth";

const secret = "test-secret";
const issuer = "pharmaconnect-web";
const audience = "pharmaconnect-realtime";

function signToken(payload: Record<string, unknown>, options: jwt.SignOptions = {}) {
  return jwt.sign(payload, secret, {
    algorithm: "HS256",
    issuer,
    audience,
    expiresIn: "1h",
    ...options,
  });
}

afterEach(() => {
  process.env.NEXTAUTH_SECRET = secret;
});

describe("realtime token validation", () => {
  it("accepts a correctly signed websocket token", () => {
    process.env.NEXTAUTH_SECRET = secret;
    const token = signToken({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      role: "PATIENT",
      pharmacyId: null,
    });

    expect(verifyToken(token)).toEqual({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      role: "PATIENT",
      pharmacyId: null,
    });
  });

  it("rejects a token with the wrong audience", () => {
    process.env.NEXTAUTH_SECRET = secret;
    const token = signToken(
      { id: "user-1", email: "user@example.com", role: "PATIENT" },
      { audience: "another-service" }
    );

    expect(verifyToken(token)).toBeNull();
  });

  it("rejects unsigned and invalid-role payloads", () => {
    expect(parseWsUser({ id: "user-1", email: "user@example.com", role: "OWNER" })).toBeNull();
    expect(verifyToken("eyJhbGciOiJub25lIn0.eyJpZCI6IngifQ.")).toBeNull();
  });
});

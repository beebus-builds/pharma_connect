import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { update, getServerSession, hash } = vi.hoisted(() => ({
  update: vi.fn(),
  getServerSession: vi.fn(),
  hash: vi.fn(async (v: string) => `hashed:${v}`),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { user: { update } } }));
vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("bcryptjs", () => ({ default: { hash } }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import { PATCH } from "../user/update/route";

const ALICE = { id: "u1", name: "Alice", email: "alice@example.com", role: "PATIENT" };

function req(body: unknown) {
  return new NextRequest("https://pharmaconnect.test/api/user/update", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  update.mockReset();
  hash.mockClear();
  getServerSession.mockReset();
  getServerSession.mockResolvedValue({ user: ALICE });
  update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...ALICE, ...data }));
});

describe("PATCH /api/user/update", () => {
  it("401s without a session", async () => {
    getServerSession.mockResolvedValue(null);
    expect((await PATCH(req({ name: "Alicia" }))).status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates a trimmed name and returns the public shape only", async () => {
    const res = await PATCH(req({ name: "  Alicia  " }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { name: "Alicia" } });
    await expect(res.json()).resolves.toEqual({
      message: "Profile updated successfully",
      user: { id: "u1", name: "Alicia", email: "alice@example.com", role: "PATIENT" },
    });
  });

  it("hashes a password before persisting it", async () => {
    await PATCH(req({ password: "hunter2hunter2" }));
    expect(hash).toHaveBeenCalledWith("hunter2hunter2", 10);
    expect(update.mock.calls[0][0].data.password).toBe("hashed:hunter2hunter2");
  });

  it("never echoes the password hash back", async () => {
    update.mockResolvedValue({ ...ALICE, password: "hashed:secret" });
    const body = await (await PATCH(req({ password: "hunter2hunter2" }))).json();
    expect(JSON.stringify(body)).not.toContain("hashed:");
  });

  it("rejects an empty payload instead of issuing a no-op update", async () => {
    expect((await PATCH(req({}))).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects unknown fields so a role or email cannot be smuggled through", async () => {
    for (const body of [
      { name: "Alicia", role: "ADMIN" },
      { email: "attacker@example.com" },
      { verified: true },
    ]) {
      expect((await PATCH(req(body))).status).toBe(400);
    }
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects out-of-range values", async () => {
    for (const body of [{ name: "A" }, { name: "x".repeat(101) }, { password: "short" }, { password: "x".repeat(101) }]) {
      expect((await PATCH(req(body))).status).toBe(400);
    }
    expect(update).not.toHaveBeenCalled();
  });

  it("400s on a non-JSON body rather than 500ing", async () => {
    expect((await PATCH(req("{not json"))).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("500s when the database rejects the write", async () => {
    update.mockRejectedValue(new Error("db down"));
    expect((await PATCH(req({ name: "Alicia" }))).status).toBe(500);
  });
});

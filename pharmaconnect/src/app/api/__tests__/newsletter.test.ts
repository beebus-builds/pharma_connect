import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// `vi.mock` factories are hoisted above the imports, so the shared spies have to
// be created with `vi.hoisted` to exist by the time the route is imported.
const { upsert } = vi.hoisted(() => ({ upsert: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: { newsletterSubscriber: { upsert } },
}));

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

vi.mock("@/lib/rateLimit", () => ({ rateLimit: vi.fn(async () => null) }));

import { POST } from "../newsletter/route";

function req(body: unknown) {
  return new NextRequest("https://pharmaconnect.test/api/newsletter", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  upsert.mockReset();
  upsert.mockResolvedValue({ id: "n1", email: "a@b.com" });
});

describe("POST /api/newsletter", () => {
  it("stores a normalized, subscribed record", async () => {
    const res = await POST(req({ email: "  Reader@Example.COM " }));
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({ message: "Thanks for subscribing!" });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "reader@example.com" },
        create: expect.objectContaining({ email: "reader@example.com", source: "footer" }),
        update: expect.objectContaining({ unsubscribedAt: null }),
      })
    );
  });

  it("records the requested locale, defaulting to en", async () => {
    await POST(req({ email: "a@b.com", locale: "ne" }));
    expect(upsert.mock.calls[0][0].create.locale).toBe("ne");

    upsert.mockClear();
    await POST(req({ email: "a@b.com", locale: "fr" }));
    expect(upsert.mock.calls[0][0].create.locale).toBe("en");
  });

  it("rejects malformed and non-email addresses without touching the DB", async () => {
    const cases = [{ email: "not-an-email" }, { email: "" }, {}];
    for (const body of cases) {
      const res = await POST(req(body));
      expect(res.status).toBe(400);
    }
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects disposable inboxes", async () => {
    const res = await POST(req({ email: "throwaway@mailinator.com" }));
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("swallows a tripped honeypot with a success response", async () => {
    const res = await POST(req({ email: "bot@spam.com", website: "http://spam.example" }));
    expect(res.status).toBe(201);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("returns 400 for an unparseable body", async () => {
    const res = await POST(
      new NextRequest("https://pharmaconnect.test/api/newsletter", { method: "POST", body: "{oops" })
    );
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("returns 500 when the database fails", async () => {
    upsert.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(req({ email: "a@b.com" }));
    expect(res.status).toBe(500);
  });
});

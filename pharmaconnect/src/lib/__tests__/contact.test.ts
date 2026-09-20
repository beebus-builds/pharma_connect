import { describe, it, expect } from "vitest";
import { normalizeNepalPhone, viberUrl, whatsappUrl } from "../contact";

describe("contact links", () => {
  it("normalizes Nepali numbers to international digits", () => {
    expect(normalizeNepalPhone("01-4223344")).toBe("97714223344");
    expect(normalizeNepalPhone("9851054321")).toBe("9779851054321");
    expect(normalizeNepalPhone("+9779851054321")).toBe("9779851054321");
    expect(normalizeNepalPhone("9779851054321")).toBe("9779851054321");
    expect(normalizeNepalPhone("not a number")).toBeNull();
    expect(normalizeNepalPhone("123")).toBeNull();
  });

  it("builds WhatsApp and Viber links", () => {
    const wa = whatsappUrl("01-4223344", "Test Pharmacy");
    expect(wa).toMatch(/^https:\/\/wa\.me\/97714223344\?text=/);
    expect(viberUrl("01-4223344")).toBe("viber://chat?number=%2B97714223344");
    expect(whatsappUrl("garbage")).toBeNull();
    expect(viberUrl("garbage")).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import {
  slugifyGeneric,
  deslugifyGeneric,
  normalizeSlug,
  facebookShareUrl,
  medicineSeoTitle,
  medicineSeoDescription,
} from "../seo";

describe("SEO helpers (Phase 2)", () => {
  it("slugifies generic names", () => {
    expect(slugifyGeneric("Paracetamol")).toBe("paracetamol");
    expect(slugifyGeneric("Vitamin C")).toBe("vitamin-c");
    expect(slugifyGeneric("  Co-Amoxiclav  500mg ")).toBe("co-amoxiclav-500mg");
  });

  it("round-trips slugs for display fallback", () => {
    expect(deslugifyGeneric("vitamin-c")).toBe("Vitamin C");
    expect(normalizeSlug("Vitamin_C")).toBe("vitamin-c");
    expect(normalizeSlug("PARACETAMOL")).toBe("paracetamol");
  });

  it("builds zero-SDK facebook share intents", () => {
    const url = "https://example.com/medicines/paracetamol";
    expect(facebookShareUrl(url)).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    );
  });

  it("builds medicine titles and descriptions", () => {
    expect(medicineSeoTitle("Paracetamol")).toContain("Paracetamol");
    const desc = medicineSeoDescription("Paracetamol", 3, 2, 5);
    expect(desc).toContain("Paracetamol");
    expect(desc).toContain("3 brands");
    expect(desc).toContain("2 strengths");
  });
});

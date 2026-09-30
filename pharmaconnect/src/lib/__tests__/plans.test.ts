import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  PLANS,
  effectivePlan,
  expiryAfterPurchase,
  daysRemaining,
  getPlan,
  getPlanCatalog,
  isPlan,
  isPlanActive,
  renewalStart,
  PLAN_PERIOD_DAYS,
} from "../plans";

const NOW = new Date("2026-09-28T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("plan catalog", () => {
  beforeEach(() => {
    delete process.env.PLAN_PRICE_NPR_FREE;
    delete process.env.PLAN_PRICE_NPR_VERIFIED;
    delete process.env.PLAN_PRICE_NPR_FEATURED;
  });

  it("exposes exactly the three specced tiers in rank order", () => {
    const catalog = getPlanCatalog();
    expect(catalog.map((p) => p.plan)).toEqual([...PLANS]);
    expect(catalog.map((p) => p.rank)).toEqual([0, 1, 2]);
    expect(catalog.map((p) => p.paid)).toEqual([false, true, true]);
  });

  it("prices everything in whole rupees and paisa", () => {
    for (const plan of getPlanCatalog()) {
      expect(plan.priceRupees).toBe(Math.floor(plan.priceRupees));
      expect(plan.pricePaisa).toBe(plan.priceRupees * 100);
    }
  });

  it("keeps the free tier free", () => {
    expect(getPlan("FREE").pricePaisa).toBe(0);
  });

  it("reads prices from env so ops can change them without a deploy", () => {
    process.env.PLAN_PRICE_NPR_VERIFIED = "1500";
    process.env.PLAN_PRICE_NPR_FEATURED = "3499.99";
    expect(getPlan("VERIFIED").pricePaisa).toBe(150_000);
    expect(getPlan("FEATURED").pricePaisa).toBe(349_900);
  });

  it("falls back on a malformed or negative price instead of charging nonsense", () => {
    for (const bad of ["abc", "-5", "NaN", ""]) {
      process.env.PLAN_PRICE_NPR_VERIFIED = bad;
      const plan = getPlan("VERIFIED");
      expect(plan.priceRupees, `price "${bad}"`).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(plan.pricePaisa)).toBe(true);
    }
  });

  it("rejects unknown plan names", () => {
    expect(isPlan("VERIFIED")).toBe(true);
    expect(isPlan("GOLD")).toBe(false);
    expect(isPlan(undefined)).toBe(false);
  });
});

describe("expiry is derived, never stored", () => {
  it("keeps a paid plan active before it lapses", () => {
    const future = new Date(NOW.getTime() + DAY);
    expect(effectivePlan("FEATURED", future, NOW)).toBe("FEATURED");
    expect(isPlanActive("FEATURED", future, NOW)).toBe(true);
  });

  it("reads a lapsed plan as FREE", () => {
    const past = new Date(NOW.getTime() - 1);
    expect(effectivePlan("VERIFIED", past, NOW)).toBe("FREE");
    expect(isPlanActive("VERIFIED", past, NOW)).toBe(false);
  });

  it("treats an expiry of exactly now as lapsed", () => {
    expect(effectivePlan("VERIFIED", NOW, NOW)).toBe("FREE");
  });

  it("treats a paid plan with no expiry as lapsed rather than eternal", () => {
    expect(effectivePlan("VERIFIED", null, NOW)).toBe("FREE");
  });

  it("never downgrades FREE", () => {
    expect(effectivePlan("FREE", new Date(NOW.getTime() + 10 * DAY), NOW)).toBe("FREE");
  });

  it("reports days remaining, floored at zero", () => {
    expect(daysRemaining("VERIFIED", new Date(NOW.getTime() + 5 * DAY), NOW)).toBe(5);
    expect(daysRemaining("VERIFIED", new Date(NOW.getTime() - 5 * DAY), NOW)).toBe(0);
    expect(daysRemaining("FREE", new Date(NOW.getTime() + 5 * DAY), NOW)).toBeNull();
    expect(daysRemaining("VERIFIED", null, NOW)).toBeNull();
  });
});

describe("renewal", () => {
  it("extends from the current expiry so a renewal does not discard paid time", () => {
    const expiry = new Date(NOW.getTime() + 10 * DAY);
    expect(renewalStart(expiry, NOW).getTime()).toBe(expiry.getTime());
    expect(expiryAfterPurchase(renewalStart(expiry, NOW), PLAN_PERIOD_DAYS).getTime()).toBe(
      expiry.getTime() + PLAN_PERIOD_DAYS * DAY
    );
  });

  it("starts from now once a plan has lapsed", () => {
    const past = new Date(NOW.getTime() - 10 * DAY);
    expect(renewalStart(past, NOW).getTime()).toBe(NOW.getTime());
  });

  it("starts from now for a pharmacy that never subscribed", () => {
    expect(renewalStart(null, NOW).getTime()).toBe(NOW.getTime());
  });

  it("stacks two renewals without losing the first period", () => {
    const first = expiryAfterPurchase(NOW, PLAN_PERIOD_DAYS);
    const second = expiryAfterPurchase(renewalStart(first, NOW), PLAN_PERIOD_DAYS);
    expect(second.getTime() - first.getTime()).toBe(PLAN_PERIOD_DAYS * DAY);
    expect(effectivePlan("VERIFIED", second, NOW)).toBe("VERIFIED");
  });
});

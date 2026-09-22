import { describe, it, expect } from "vitest";
import {
  crossedLowThreshold,
  effectiveThreshold,
  formatExpiry,
  isExpired,
  isExpiringSoon,
  DEFAULT_LOW_STOCK_THRESHOLD,
} from "../inventory";

const NOW = new Date("2026-09-21T00:00:00Z");

describe("inventory rules", () => {
  it("detects expired batches", () => {
    expect(isExpired(null, NOW)).toBe(false);
    expect(isExpired(undefined, NOW)).toBe(false);
    expect(isExpired("2026-09-20", NOW)).toBe(true);
    expect(isExpired("2026-09-21T00:00:00Z", NOW)).toBe(true);
    expect(isExpired("2026-09-22", NOW)).toBe(false);
    expect(isExpired("not-a-date", NOW)).toBe(false);
  });

  it("flags batches expiring within 30 days", () => {
    expect(isExpiringSoon("2026-10-15", 30, NOW)).toBe(true);
    expect(isExpiringSoon("2027-01-01", 30, NOW)).toBe(false);
    expect(isExpiringSoon("2026-09-20", 30, NOW)).toBe(false); // already expired
    expect(isExpiringSoon(null, 30, NOW)).toBe(false);
  });

  it("resolves effective thresholds with fallback", () => {
    expect(effectiveThreshold(5)).toBe(5);
    expect(effectiveThreshold(0)).toBe(0);
    expect(effectiveThreshold(null)).toBe(DEFAULT_LOW_STOCK_THRESHOLD);
    expect(effectiveThreshold(undefined)).toBe(DEFAULT_LOW_STOCK_THRESHOLD);
    expect(effectiveThreshold(NaN)).toBe(DEFAULT_LOW_STOCK_THRESHOLD);
    expect(effectiveThreshold(-3)).toBe(DEFAULT_LOW_STOCK_THRESHOLD);
  });

  it("detects threshold crossings exactly once per dip", () => {
    expect(crossedLowThreshold(15, 8, 10)).toBe(true);
    expect(crossedLowThreshold(11, 10, 10)).toBe(true);
    expect(crossedLowThreshold(8, 5, 10)).toBe(false); // already low
    expect(crossedLowThreshold(5, 15, 10)).toBe(false); // restock
    expect(crossedLowThreshold(15, 12, 10)).toBe(false); // still above
  });

  it("formats expiry as Mon YYYY", () => {
    expect(formatExpiry("2026-05-01")).toMatch(/May 2026/);
    expect(formatExpiry(null)).toBe("—");
    expect(formatExpiry("junk")).toBe("—");
  });
});

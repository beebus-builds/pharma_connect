import { describe, it, expect } from "vitest";
import { haversineDistanceKm, formatDistance, stockStatus, formatRelativeTime } from "../utils";

describe("Utils", () => {
  it("calculates Haversine distance correctly", () => {
    // Distance between New York (40.7128, -74.0060) and Philadelphia (39.5233, -75.1638) is approx 130 km
    const dist = haversineDistanceKm(40.7128, -74.0060, 39.5233, -75.1638);
    expect(dist).toBeGreaterThan(150);
    expect(dist).toBeLessThan(180);
  });

  it("formats distance correctly", () => {
    expect(formatDistance(0.5)).toBe("500 m");
    expect(formatDistance(2.34)).toBe("2.3 km");
  });

  it("determines stock status correctly", () => {
    expect(stockStatus(0)).toBe("out-of-stock");
    expect(stockStatus(3)).toBe("low-stock");
    expect(stockStatus(10)).toBe("in-stock");
  });

  it("respects per-product low-stock thresholds", () => {
    expect(stockStatus(8, 10)).toBe("low-stock");
    expect(stockStatus(12, 10)).toBe("in-stock");
    expect(stockStatus(0, 10)).toBe("out-of-stock");
    expect(stockStatus(10, 10)).toBe("low-stock");
  });

  it("formats stock freshness without throwing", () => {
    const now = new Date("2026-01-01T12:00:00Z").getTime();
    expect(formatRelativeTime(null, now)).toBe("Updated recently");
    expect(formatRelativeTime("bad-date", now)).toBe("Updated recently");
    expect(formatRelativeTime(new Date(now - 30_000).toISOString(), now)).toBe("Updated just now");
    expect(formatRelativeTime(new Date(now - 5 * 60000).toISOString(), now)).toBe("Updated 5m ago");
    expect(formatRelativeTime(new Date(now - 3 * 3600000).toISOString(), now)).toBe("Updated 3h ago");
    expect(formatRelativeTime(new Date(now - 2 * 86400000).toISOString(), now)).toBe("Updated 2d ago");
  });
});

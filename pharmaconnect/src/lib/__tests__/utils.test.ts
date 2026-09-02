import { describe, it, expect } from "vitest";
import { haversineDistanceKm, formatDistance, stockStatus } from "../utils";

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
});

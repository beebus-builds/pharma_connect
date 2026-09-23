import { describe, it, expect } from "vitest";
import {
  boundingBoxForRadius,
  isValidLatLng,
  isValidLocation,
  safeCenter,
  filterValidPharmacies,
  FALLBACK_CENTER,
} from "../geo";

describe("geo guards", () => {
  it("accepts normal Kathmandu coords", () => {
    expect(isValidLatLng(27.7172, 85.324)).toBe(true);
    expect(isValidLocation({ lat: 27.7172, lng: 85.324 })).toBe(true);
  });

  it("rejects NaN, Infinity, null, undefined, strings", () => {
    expect(isValidLatLng(NaN, NaN)).toBe(false);
    expect(isValidLatLng(27.7, NaN)).toBe(false);
    expect(isValidLatLng(Infinity, 85.3)).toBe(false);
    expect(isValidLatLng(27.7, -Infinity)).toBe(false);
    expect(isValidLatLng(null, null)).toBe(false);
    expect(isValidLatLng(undefined, undefined)).toBe(false);
    expect(isValidLatLng("27.7", "85.3")).toBe(false);
    expect(isValidLocation(null)).toBe(false);
    expect(isValidLocation({ lat: NaN, lng: NaN })).toBe(false);
  });

  it("rejects out-of-range values", () => {
    expect(isValidLatLng(91, 0)).toBe(false);
    expect(isValidLatLng(0, 181)).toBe(false);
  });

  it("safeCenter falls back instead of throwing", () => {
    expect(safeCenter({ lat: NaN, lng: NaN })).toEqual(FALLBACK_CENTER);
    expect(safeCenter(null)).toEqual(FALLBACK_CENTER);
    expect(safeCenter({ lat: 27.7, lng: 85.3 })).toEqual({ lat: 27.7, lng: 85.3 });
  });

  it("creates a conservative radius bounding box", () => {
    const box = boundingBoxForRadius(27.7172, 85.324, 5);
    expect(box.minLat).toBeLessThan(27.7172);
    expect(box.maxLat).toBeGreaterThan(27.7172);
    expect(box.minLng).toBeLessThan(85.324);
    expect(box.maxLng).toBeGreaterThan(85.324);
  });

  it("filterValidPharmacies drops bad rows, keeps good ones", () => {
    const rows = [
      { id: "a", latitude: 27.7, longitude: 85.3 },
      { id: "b", latitude: NaN, longitude: NaN },
      { id: "c", latitude: Infinity, longitude: 85.3 },
    ];
    expect(filterValidPharmacies(rows).map((r) => r.id)).toEqual(["a"]);
  });
});

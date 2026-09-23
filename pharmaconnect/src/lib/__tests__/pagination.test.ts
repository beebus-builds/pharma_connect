import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "../pagination";

describe("cursor pagination", () => {
  it("round-trips supported cursor values", () => {
    const cursor = encodeCursor({ kind: "nearby", distanceKm: 2.345, pharmacyId: "p1", active: true });
    expect(decodeCursor(cursor)).toEqual({
      kind: "nearby",
      distanceKm: 2.345,
      pharmacyId: "p1",
      active: true,
    });
  });

  it("rejects malformed and unsupported cursors", () => {
    expect(decodeCursor("not-a-cursor")).toBeNull();
    expect(decodeCursor(Buffer.from(JSON.stringify({ v: 2, id: "p1" })).toString("base64url"))).toBeNull();
  });
});

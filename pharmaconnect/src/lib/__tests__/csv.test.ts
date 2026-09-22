import { describe, it, expect } from "vitest";
import { parseCsv, toCsv, INVENTORY_CSV_HEADERS } from "../csv";

describe("csv", () => {
  it("parses headers + rows, skips blank lines", () => {
    const rows = parseCsv("a,b,c\n1,2,3\n\n4,5,6\n");
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("handles quotes, commas inside quotes, escaped quotes, CRLF", () => {
    const rows = parseCsv('name,note\r\n"Acme, Inc.","said ""hi"""\r\nplain,ok\r\n');
    expect(rows).toEqual([
      ["name", "note"],
      ["Acme, Inc.", 'said "hi"'],
      ["plain", "ok"],
    ]);
  });

  it("strips BOM", () => {
    expect(parseCsv("﻿a,b\n1,2")[0]).toEqual(["a", "b"]);
  });

  it("round-trips the inventory template", () => {
    const csv = toCsv([...INVENTORY_CSV_HEADERS], [
      ["Paracetamol", "Napa", "500mg", "Beximco", 25, 45, "2027-05-01", 10],
      ["Ibuprofen", "Brufen, Extra", "400mg", "Abbott", 0, "", "", 5],
    ]);
    const rows = parseCsv(csv);
    expect(rows[0]).toEqual([...INVENTORY_CSV_HEADERS]);
    expect(rows[1][1]).toBe("Napa");
    expect(rows[2][1]).toBe("Brufen, Extra");
    expect(rows[2][4]).toBe("0");
  });
});

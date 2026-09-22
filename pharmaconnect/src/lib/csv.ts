/**
 * Minimal CSV parse/stringify for inventory import/export.
 * Handles quoted fields, commas inside quotes, escaped quotes (""), and CRLF.
 * No dependency needed at this scale (imports capped at 500 rows server-side).
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    // Skip fully-empty trailing lines
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
    row = [];
  };

  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushField();
    } else if (c === "\r") {
      // ignore, \n will end the row
    } else if (c === "\n") {
      pushField();
      pushRow();
    } else {
      field += c;
    }
  }
  // Last line without trailing newline
  if (field !== "" || row.length > 0) {
    pushField();
    pushRow();
  }
  return rows;
}

function escapeCsvField(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [headers.map(escapeCsvField).join(",")];
  for (const r of rows) lines.push(r.map(escapeCsvField).join(","));
  return lines.join("\r\n") + "\r\n";
}

export const INVENTORY_CSV_HEADERS = [
  "genericName",
  "brandName",
  "strength",
  "manufacturer",
  "quantity",
  "mrp",
  "expiryDate",
  "lowStockThreshold",
] as const;

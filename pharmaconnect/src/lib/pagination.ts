export type CursorValue = string | number | boolean | null;
export type CursorPayload = Record<string, CursorValue>;

export function encodeCursor(payload: CursorPayload) {
  return Buffer.from(JSON.stringify({ v: 1, ...payload }), "utf8").toString("base64url");
}

export function decodeCursor(value: string | null | undefined): CursorPayload | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    const record = parsed as Record<string, unknown>;
    if (record.v !== 1) return null;

    const payload: CursorPayload = {};
    for (const [key, entry] of Object.entries(record)) {
      if (key === "v") continue;
      if (entry !== null && !["string", "number", "boolean"].includes(typeof entry)) return null;
      payload[key] = entry as CursorValue;
    }
    return payload;
  } catch {
    return null;
  }
}

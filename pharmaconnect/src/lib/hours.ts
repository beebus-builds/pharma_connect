/**
 * openingHours format: { mon: "09:00-21:00", tue: "09:00-21:00", sun: "closed" }
 * Multiple ranges can be separated by a comma: "09:00-13:00, 16:00-21:00".
 * A null/undefined entry or "24h" / "24 hours" means open all day.
 */
export function isOpenNow(
  openingHours: Record<string, string> | null | undefined,
  date: Date = new Date()
): boolean {
  if (!openingHours) return false;
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const today = days[date.getDay()];
  const spec = openingHours[today] ?? openingHours[today.toLowerCase()];
  if (!spec) return false;
  const normalized = spec.trim().toLowerCase();
  if (normalized === "closed" || normalized === "") return false;
  if (normalized === "24h" || normalized === "24 hours" || normalized === "always") return true;

  const minutesNow = date.getHours() * 60 + date.getMinutes();
  for (const range of normalized.split(",")) {
    const [startStr, endStr] = range.trim().split("-").map((s) => s.trim());
    const start = toMinutes(startStr);
    const end = toMinutes(endStr);
    if (start === null || end === null) continue;
    // Overnight range like 20:00-02:00
    if (end < start) {
      if (minutesNow >= start || minutesNow <= end) return true;
    } else if (minutesNow >= start && minutesNow <= end) {
      return true;
    }
  }
  return false;
}

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

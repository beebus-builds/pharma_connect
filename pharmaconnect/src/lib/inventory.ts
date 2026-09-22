/** Shared production-inventory rules (pure, unit-tested). */

export const DEFAULT_LOW_STOCK_THRESHOLD = 10;
export const EXPIRY_WARNING_DAYS = 30;
export const CSV_MAX_ROWS = 500;
export const CSV_MAX_BYTES = 1 * 1024 * 1024; // 1 MB

export function isExpired(expiryDate: Date | string | null | undefined, now = new Date()): boolean {
  if (!expiryDate) return false;
  const d = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() <= now.getTime();
}

export function isExpiringSoon(
  expiryDate: Date | string | null | undefined,
  withinDays = EXPIRY_WARNING_DAYS,
  now = new Date()
): boolean {
  if (!expiryDate) return false;
  const d = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  if (Number.isNaN(d.getTime())) return false;
  const diff = d.getTime() - now.getTime();
  return diff > 0 && diff <= withinDays * 24 * 60 * 60 * 1000;
}

/** Effective low-stock threshold for a row (falls back to the default). */
export function effectiveThreshold(lowStockThreshold: number | null | undefined): number {
  return typeof lowStockThreshold === "number" && Number.isFinite(lowStockThreshold) && lowStockThreshold >= 0
    ? lowStockThreshold
    : DEFAULT_LOW_STOCK_THRESHOLD;
}

/**
 * Did this update cross from above-threshold to at/below-threshold?
 * Used to fire the low-stock email exactly once per crossing.
 */
export function crossedLowThreshold(
  oldQuantity: number,
  newQuantity: number,
  threshold: number
): boolean {
  return oldQuantity > threshold && newQuantity <= threshold;
}

export function formatExpiry(expiryDate: Date | string | null | undefined): string {
  if (!expiryDate) return "—";
  const d = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

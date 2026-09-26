/**
 * SEO helpers for PharmaConnect growth phase (SPECS 2A/2B).
 * Pure functions — safe to unit test, no DB access here.
 */

export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

/** "Vitamin C" -> "vitamin-c", "Co-Amoxiclav 500mg" -> "co-amoxiclav-500mg" */
export function slugifyGeneric(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Reverse a slug for display fallback when DB lookup misses. */
export function deslugifyGeneric(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Normalize slugs for comparison (handles %20, underscores, case). */
export function normalizeSlug(input: string): string {
  try {
    input = decodeURIComponent(input);
  } catch {
    // keep raw input if malformed
  }
  return slugifyGeneric(input.replace(/_/g, "-"));
}

export function medicineCanonicalUrl(genericName: string): string {
  return `${getSiteUrl()}/medicines/${slugifyGeneric(genericName)}`;
}

export function pharmacyCanonicalUrl(id: string): string {
  return `${getSiteUrl()}/pharmacies/${id}`;
}

/** Zero-SDK Facebook share intent — plain link, no app id required. */
export function facebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function whatsappShareUrl(url: string, text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}

export function viberShareUrl(url: string, text: string): string {
  return `viber://forward?text=${encodeURIComponent(`${text} ${url}`)}`;
}

/** Template description for a generic — no `Medicine.description` column needed. */
export function medicineSeoDescription(
  genericName: string,
  brandCount: number,
  strengthCount: number,
  inStockCount?: number
): string {
  const stockBit =
    typeof inStockCount === "number"
      ? ` ${inStockCount} pack${inStockCount === 1 ? "" : "s"} currently listed in stock.`
      : "";
  return (
    `Find ${genericName} price and availability in Nepal. ` +
    `Compare ${brandCount} brand${brandCount === 1 ? "" : "s"} ` +
    `and ${strengthCount} strength${strengthCount === 1 ? "" : "s"} ` +
    `across verified pharmacies in Kathmandu, Lalitpur and Bhaktapur.` +
    stockBit +
    ` Request stock and chat directly with the pharmacy — no account needed to browse.`
  );
}

export function medicineSeoTitle(genericName: string): string {
  return `${genericName} price in Nepal — availability near you | PharmaConnect`;
}

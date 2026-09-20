/** Nepal bounding box + disposable-email guards (free, offline, no API key). */

export const NEPAL_BBOX = {
  minLat: 26.3,
  maxLat: 30.5,
  minLng: 80.0,
  maxLng: 88.3,
} as const;

export function isInNepal(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= NEPAL_BBOX.minLat &&
    lat <= NEPAL_BBOX.maxLat &&
    lng >= NEPAL_BBOX.minLng &&
    lng <= NEPAL_BBOX.maxLng
  );
}

/** Well-known throwaway-mail providers. Matched on exact domain or subdomains. */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "mailinator.net",
  "mailinator.org",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "mytemp.email",
  "eztempmail.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "10minutemail.com",
  "10minutemail.net",
  "throwawaymail.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "mohmal.com",
  "trashmail.com",
  "trash-mail.com",
  "maildrop.cc",
  "getnada.com",
  "tempail.com",
  "fakemail.net",
  "sharklasers.com",
  "dispostable.com",
  "emailondeck.com",
  "harakirimail.com",
  "mailnesia.com",
  "mintemail.com",
  "spamgourmet.com",
  "burnermail.io",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@").pop() ?? "";
  if (!domain) return false;
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  // Catch subdomains like xyz.mailinator.com
  for (const blocked of DISPOSABLE_EMAIL_DOMAINS) {
    if (domain.endsWith(`.${blocked}`)) return true;
  }
  return false;
}

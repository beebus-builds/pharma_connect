/** Free contact links (WhatsApp / Viber) built from a pharmacy's phone number. No API key. */

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Normalize a Nepali phone number to international digits (977…).
 * Returns null when the number can't plausibly be dialed on chat apps.
 */
export function normalizeNepalPhone(phone: string): string | null {
  let d = digitsOnly(phone);
  if (!d) return null;
  if (d.startsWith("977")) {
    // already international — keep as is
  } else if (d.startsWith("0")) {
    d = `977${d.slice(1)}`;
  } else if (d.length === 10 && d.startsWith("9")) {
    d = `977${d}`; // mobile typed without trunk prefix
  } else {
    return null;
  }
  return d.length >= 11 && d.length <= 13 ? d : null;
}

/** wa.me link with a pre-filled greeting, or null when the number is unusable. */
export function whatsappUrl(phone: string, pharmacyName?: string): string | null {
  const normalized = normalizeNepalPhone(phone);
  if (!normalized) return null;
  const text = encodeURIComponent(
    `Namaste${pharmacyName ? ` ${pharmacyName}` : ""}! I found you on PharmaConnect and need a medicine.`
  );
  return `https://wa.me/${normalized}?text=${text}`;
}

/** Viber chat link (opens the Viber app), or null when the number is unusable. */
export function viberUrl(phone: string): string | null {
  const normalized = normalizeNepalPhone(phone);
  if (!normalized) return null;
  return `viber://chat?number=%2B${normalized}`;
}

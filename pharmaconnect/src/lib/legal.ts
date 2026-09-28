/**
 * Legal-page identity. The Terms and Privacy pages must never render a
 * placeholder to real users, so every value here is env-driven and the pages
 * omit a line entirely when the operator has not configured it yet.
 *
 * Copy into .env (see .env.example):
 *   LEGAL_BUSINESS_NAME        registered entity name, e.g. "PharmaConnect Pvt. Ltd."
 *   LEGAL_REGISTERED_ADDRESS   postal address for the contact block
 *   LEGAL_SUPPORT_EMAIL        inbox that handles data + support requests
 */

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

export function legalBusinessName(): string {
  return env("LEGAL_BUSINESS_NAME") || "PharmaConnect";
}

export function legalSupportEmail(): string {
  return env("LEGAL_SUPPORT_EMAIL") || env("ADMIN_NOTIFY_EMAIL") || env("SMTP_FROM");
}

export function legalRegisteredAddress(): string[] {
  return env("LEGAL_REGISTERED_ADDRESS")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** True when every operator-supplied legal value is configured. Drives the dev warning. */
export function isLegalConfigComplete(): boolean {
  return Boolean(legalSupportEmail() && legalRegisteredAddress().length > 0);
}

export function legalMailtoHref(email: string): string {
  return `mailto:${email}`;
}

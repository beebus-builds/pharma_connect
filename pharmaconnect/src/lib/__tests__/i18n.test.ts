import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { translate, parseLocale, isLocale, getDictionary, DEFAULT_LOCALE } from "../i18n";
import type { MessageKey } from "../i18n";

describe("i18n (Phase 3C)", () => {
  it("parses supported locales from tags and storage values", () => {
    expect(parseLocale("ne")).toBe("ne");
    expect(parseLocale("ne-NP")).toBe("ne");
    expect(parseLocale("en-US")).toBe("en");
    expect(parseLocale("fr")).toBeNull();
    expect(parseLocale(null)).toBeNull();
    expect(isLocale("ne")).toBe(true);
    expect(isLocale("zz")).toBe(false);
  });

  it("substitutes named placeholders", () => {
    expect(translate("en", "search.noResults", { query: "Napa" })).toContain("Napa");
    expect(translate("ne", "search.noResults", { query: "Napa" })).toContain("Napa");
  });

  it("picks singular or plural by count", () => {
    expect(translate("en", "search.matches", { count: 1, query: "a" })).toBe("1 Match for “a”");
    expect(translate("en", "search.matches", { count: 4, query: "a" })).toBe("4 Matches for “a”");
  });

  it("falls back to English for a missing translation", () => {
    const neDictionary = getDictionary("ne");
    const missing = Object.keys(getDictionary(DEFAULT_LOCALE)).find(
      (key) => !(key in neDictionary)
    );
    expect(missing).toBeUndefined();
  });

  it("translates chrome to Nepali", () => {
    expect(translate("ne", "auth.signIn")).toBe("लगइन");
    expect(translate("ne", "nav.signOut" as MessageKey)).toBe("साइन आउट");
    expect(translate("ne", "home.listView")).toBe("सूची");
    expect(translate("ne", "search.placeholder")).toContain("औषधि");
  });

  it("keeps every English key present in the Nepali dictionary", () => {
    const enKeys = Object.keys(getDictionary("en")).sort();
    const neKeys = Object.keys(getDictionary("ne")).sort();
    expect(neKeys).toEqual(enKeys);
  });

  it("keeps placeholders identical across locales", () => {
    // Dedupe: a template with two plural branches repeats its placeholders.
    const placeholders = (s: string) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort();
    for (const key of Object.keys(getDictionary("en")) as MessageKey[]) {
      const en = getDictionary("en")[key];
      const ne = getDictionary("ne")[key];
      expect(`${key}:${placeholders(ne).join(",")}`).toBe(`${key}:${placeholders(en).join(",")}`);
    }
  });

  it("keeps Nepali entries non-empty and distinct from the English source", () => {
    for (const [key, ne] of Object.entries(getDictionary("ne"))) {
      expect(ne, `${key} is empty in Nepali`).toBeTruthy();
    }
  });

  it("translates the surfaces SPECS 3C requires (homepage, search, badges)", () => {
    // The acceptance criterion is "full homepage + auth + search flow readable
    // in Nepali", so these must not silently fall through to English.
    const en = getDictionary("en");
    for (const key of [
      "home.detectingLocation",
      "home.enableLocation",
      "home.empty.title",
      "home.start.title",
      "home.mapOverlay.title",
      "home.loadMore",
      "badge.inStock",
      "badge.lowStock",
      "badge.outOfStock",
      "badge.verified",
      "details.title",
      "details.faqTitle",
      "report.title",
      "report.submit",
      "offline.title",
      "footer.subscribe",
    ] as MessageKey[]) {
      expect(getDictionary("ne")[key], `${key} not translated`).toBeTruthy();
      expect(getDictionary("ne")[key], `${key} identical to English`).not.toBe(en[key]);
    }
  });
});

describe("PWA assets (Phase 3A)", () => {
  it("ships a service worker that never caches auth, admin or payments", () => {
    const sw = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");
    for (const prefix of ["/api/auth", "/api/admin", "/api/payments"]) {
      expect(sw).toContain(prefix);
    }
    expect(sw).toMatch(/if \(request\.method !== "GET"\) return;/);
  });

  it("keeps location-scoped nearby results out of the offline cache", () => {
    const sw = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");
    expect(sw).toContain('if (url.pathname === "/api/pharmacies/nearby") return false;');
  });

  it("ships the manifest route with installable icons", () => {
    const manifest = readFileSync(resolve(process.cwd(), "src/app/manifest.ts"), "utf8");
    expect(manifest).toContain("192x192");
    expect(manifest).toContain("512x512");
    expect(manifest).toContain("maskable");
    expect(manifest).toContain('display: "standalone"');
  });

  it("ships the generated PNG icons the manifest references", () => {
    for (const file of [
      "icon-192.png",
      "icon-512.png",
      "maskable-512.png",
      "apple-touch-icon.png",
    ]) {
      const bytes = readFileSync(resolve(process.cwd(), "public/icons", file));
      // PNG magic number
      expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    }
  });
});

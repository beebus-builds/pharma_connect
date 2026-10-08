"use client";

import { Languages } from "lucide-react";
import { useLocale } from "@/components/LocaleProvider";

export default function LocaleToggle() {
  const { locale, toggleLocale, t } = useLocale();
  // Label the control with the language it switches *to*, which is the
  // convention people already know from every other site.
  const next = locale === "en" ? "नेपाली" : "EN";

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={t("nav.language")}
      title={t("nav.language")}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className="hidden md:inline">{next}</span>
    </button>
  );
}

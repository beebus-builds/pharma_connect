"use client";

import { Languages } from "lucide-react";
import { useLocale } from "@/components/LocaleProvider";

export default function LocaleToggle() {
  const { locale, toggleLocale, t } = useLocale();
  const next = locale === "en" ? "नेपाली" : "EN";

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={t("nav.language")}
      title={t("nav.language")}
      className="inline-flex items-center gap-1.5 px-2.5 h-10 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
    >
      <Languages className="h-4 w-4" />
      <span className="hidden md:inline">{next}</span>
    </button>
  );
}

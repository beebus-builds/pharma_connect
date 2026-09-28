"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";
import { useLocale } from "@/components/LocaleProvider";

export default function OfflineView() {
  const { t } = useLocale();

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center animate-fadeIn">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 mb-5">
        <WifiOff className="h-8 w-8" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-black">{t("offline.title")}</h1>
      <p className="text-sm text-slate-500 mt-2">{t("offline.body")}</p>
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900"
        >
          {t("offline.retry")}
        </Link>
        <Link
          href="/medicines"
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          {t("offline.cached")}
        </Link>
      </div>
    </div>
  );
}

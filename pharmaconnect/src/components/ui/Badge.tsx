"use client";

import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/LocaleProvider";
import type { StockStatus } from "@/types";

const stockStyles: Record<StockStatus, string> = {
  "in-stock": "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  "low-stock": "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
  "out-of-stock": "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/20",
};

const stockLabelKeys = {
  "in-stock": "badge.inStock",
  "low-stock": "badge.lowStock",
  "out-of-stock": "badge.outOfStock",
} as const;

export function StockBadge({ status }: { status: StockStatus }) {
  const { t } = useLocale();
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset", stockStyles[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {t(stockLabelKeys[status])}
    </span>
  );
}

export function DistanceBadge({ km }: { km: number }) {
  const { t } = useLocale();
  const label =
    km < 1 ? t("badge.metersAway", { m: Math.round(km * 1000) }) : t("badge.kmAway", { km: km.toFixed(1) });
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-600/20 dark:bg-primary-500/10 dark:text-primary-300 dark:ring-primary-400/20">
      {label}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: "PENDING" | "AVAILABLE" | "UNAVAILABLE"; label?: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
    AVAILABLE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
    UNAVAILABLE: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/20",
  };
  return <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset", styles[status])}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{label || status}</span>;
}

export function VerifiedBadge() {
  const { t } = useLocale();
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20">
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {t("badge.verified")}
    </span>
  );
}

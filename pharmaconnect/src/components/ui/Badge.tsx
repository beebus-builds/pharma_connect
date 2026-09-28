"use client";

import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/LocaleProvider";
import type { StockStatus } from "@/types";

const stockStyles: Record<StockStatus, string> = {
  "in-stock": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "low-stock": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "out-of-stock": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const stockLabelKeys = {
  "in-stock": "badge.inStock",
  "low-stock": "badge.lowStock",
  "out-of-stock": "badge.outOfStock",
} as const;

export function StockBadge({ status }: { status: StockStatus }) {
  const { t } = useLocale();
  return (
    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", stockStyles[status])}>
      {t(stockLabelKeys[status])}
    </span>
  );
}

export function DistanceBadge({ km }: { km: number }) {
  const { t } = useLocale();
  const label =
    km < 1 ? t("badge.metersAway", { m: Math.round(km * 1000) }) : t("badge.kmAway", { km: km.toFixed(1) });
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
      {label}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: "PENDING" | "AVAILABLE" | "UNAVAILABLE"; label?: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    AVAILABLE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    UNAVAILABLE: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
  return <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", styles[status])}>{label || status}</span>;
}

export function VerifiedBadge() {
  const { t } = useLocale();
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {t("badge.verified")}
    </span>
  );
}

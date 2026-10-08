"use client";

import { BadgeCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/LocaleProvider";
import type { StockStatus } from "@/types";

/**
 * Tone vocabulary for every pill in the app.
 *
 * Previously each call site invented its own emerald/amber/red/slate pair, which
 * is how `text-green-500` in one place and `text-emerald-600` in another ended
 * up meaning the same thing. Severity is now a single enum.
 */
export type BadgeTone = "neutral" | "accent" | "info" | "success" | "warning" | "danger";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-surface-sunken text-fg-muted ring-line",
  accent: "bg-accent-soft text-accent ring-accent/25",
  info: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20",
  success:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  warning:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
  danger:
    "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/20",
};

export function Badge({
  className,
  tone = "neutral",
  icon,
  children,
}: {
  className?: string;
  tone?: BadgeTone;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  const Icon = icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-xs font-semibold rounded-full ring-1 ring-inset",
        badgeTones[tone],
        className
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Small filled dot that matches the badge text colour — used inside badges. */
function Dot() {
  return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />;
}

const stockTone: Record<StockStatus, BadgeTone> = {
  "in-stock": "success",
  "low-stock": "warning",
  "out-of-stock": "danger",
};

const stockLabelKeys = {
  "in-stock": "badge.inStock",
  "low-stock": "badge.lowStock",
  "out-of-stock": "badge.outOfStock",
} as const;

export function StockBadge({ status }: { status: StockStatus }) {
  const { t } = useLocale();
  return (
    <Badge tone={stockTone[status]}>
      <Dot />
      {t(stockLabelKeys[status])}
    </Badge>
  );
}

export function DistanceBadge({ km }: { km: number }) {
  const { t } = useLocale();
  const label =
    km < 1
      ? t("badge.metersAway", { m: Math.round(km * 1000) })
      : t("badge.kmAway", { km: km.toFixed(1) });
  return <Badge tone="accent">{label}</Badge>;
}

const requestTone: Record<string, BadgeTone> = {
  PENDING: "warning",
  AVAILABLE: "success",
  UNAVAILABLE: "neutral",
};

export function StatusBadge({
  status,
  label,
  tone,
}: {
  status: string;
  label?: string;
  tone?: BadgeTone;
}) {
  const resolved = tone ?? requestTone[status] ?? "neutral";
  // Semantic statuses read better with a leading dot; opaque ones (e.g. a report
  // queue's RESOLVED) read better as plain text.
  const withDot = Boolean(requestTone[status]);
  return (
    <Badge tone={resolved}>
      {withDot && <Dot />}
      {label ?? status}
    </Badge>
  );
}

export function VerifiedBadge({ label }: { label?: string }) {
  const { t } = useLocale();
  return (
    <Badge tone="info" icon={BadgeCheck}>
      {label ?? t("badge.verified")}
    </Badge>
  );
}

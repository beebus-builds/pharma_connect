import { cn } from "@/lib/utils";
import type { StockStatus } from "@/types";

const stockStyles: Record<StockStatus, string> = {
  "in-stock": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "low-stock": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "out-of-stock": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const stockLabels: Record<StockStatus, string> = {
  "in-stock": "In Stock",
  "low-stock": "Low Stock",
  "out-of-stock": "Out of Stock",
};

export function StockBadge({ status }: { status: StockStatus }) {
  return (
    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", stockStyles[status])}>
      {stockLabels[status]}
    </span>
  );
}

export function DistanceBadge({ km }: { km: number }) {
  const label = km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`;
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: "PENDING" | "AVAILABLE" | "UNAVAILABLE" }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    AVAILABLE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    UNAVAILABLE: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
  return <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", styles[status])}>{status}</span>;
}

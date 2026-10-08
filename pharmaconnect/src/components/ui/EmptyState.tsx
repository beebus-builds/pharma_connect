import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
  /** Softer treatment for "nothing wrong here" vs "we could not load this". */
  tone?: "default" | "error";
  className?: string;
}

/**
 * Centered empty / error / start state. Keeps every terminal state consistent and
 * always offers the next action — the hand-rolled versions on the dashboards and
 * admin queues had no icon, no action, or both.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  tone = "default",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center sm:py-14",
        tone === "error"
          ? "border-red-300 bg-red-50/60 dark:border-red-500/30 dark:bg-red-500/5"
          : "border-line-strong bg-surface-sunken/60",
        className
      )}
    >
      <div
        className={cn(
          "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-inset",
          tone === "error"
            ? "bg-red-100 text-red-600 ring-red-200 dark:bg-red-500/15 dark:text-red-400 dark:ring-red-500/25"
            : "bg-surface text-fg-subtle ring-line"
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="font-display text-lg font-semibold text-fg text-balance">{title}</h3>
      {body && (
        <p className="mx-auto mt-1.5 max-w-[46ch] text-sm leading-relaxed text-fg-muted text-pretty">
          {body}
        </p>
      )}
      {action && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>
      )}
    </div>
  );
}

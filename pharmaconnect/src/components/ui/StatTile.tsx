import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "positive" | "warning" | "critical";

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  /** Numeric metrics render with tabular figures; strings are allowed for unit values like "1.4". */
  value: number | string;
  tone?: Tone;
  /** Optional secondary line, e.g. "of 24 listings". */
  caption?: string;
  onClick?: () => void;
  className?: string;
}

const tones: Record<Tone, { icon: string; accent: string; value: string }> = {
  neutral: {
    icon: "bg-surface-sunken text-fg-muted",
    accent: "bg-fg-subtle",
    value: "text-fg",
  },
  accent: {
    icon: "bg-accent-soft text-accent",
    accent: "bg-accent",
    value: "text-fg",
  },
  positive: {
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    accent: "bg-emerald-500",
    value: "text-emerald-700 dark:text-emerald-400",
  },
  warning: {
    icon: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    accent: "bg-amber-500",
    value: "text-amber-700 dark:text-amber-400",
  },
  critical: {
    icon: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    accent: "bg-red-500",
    value: "text-red-700 dark:text-red-400",
  },
};

/**
 * Compact metric tile.
 *
 * The dashboard had three near-identical cards differing only by icon color and
 * a `border-l-4`, which made the numbers hard to scan at a glance. Tying the
 * accent to the value's severity and switching the type to a display face makes
 * the outlier pop.
 */
export function StatTile({ icon: Icon, label, value, tone = "neutral", caption, onClick, className }: StatTileProps) {
  const t = tones[tone];
  const interactive = typeof onClick === "function";

  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line bg-surface p-3.5 shadow-card transition-[box-shadow,border-color] duration-200 sm:p-4",
        interactive &&
          "cursor-pointer hover:border-line-strong hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas motion-reduce:transition-none",
        className
      )}
    >
      {/* Severity accent as a hairline rather than a heavy left border. */}
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-0.5", t.accent)} />
      <div className="flex items-start justify-between gap-2">
        <div className={cn("w-fit shrink-0 rounded-lg p-2", t.icon)}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
        </div>
      </div>
      <p
        className={cn(
          "tabular mt-2.5 font-display text-2xl font-semibold leading-none sm:text-3xl",
          t.value
        )}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-[11px] font-semibold text-fg-muted sm:text-xs">{label}</p>
      {caption && <p className="mt-0.5 truncate text-[11px] text-fg-subtle">{caption}</p>}
    </div>
  );
}

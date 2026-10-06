import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "positive" | "warning" | "critical";

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

const tones: Record<Tone, { icon: string; accent: string }> = {
  neutral: {
    icon: "bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-slate-400",
    accent: "text-stone-300 dark:text-slate-700",
  },
  positive: {
    icon: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    icon: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
    accent: "text-amber-600 dark:text-amber-400",
  },
  critical: {
    icon: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400",
    accent: "text-red-600 dark:text-red-400",
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
        "relative overflow-hidden rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card p-3.5 sm:p-4",
        interactive &&
          "cursor-pointer transition-shadow hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/40 motion-reduce:transition-none",
        className
      )}
    >
      {/* Severity accent as a hairline rather than a heavy left border. */}
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-0.5", t.accent)} />
      <div className={cn("p-2 rounded-lg shrink-0 w-fit", t.icon)}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
      </div>
      <p className="font-display text-2xl sm:text-3xl font-semibold text-ink dark:text-white mt-2.5 tabular-nums leading-none">
        {value}
      </p>
      <p className="text-[11px] sm:text-xs font-semibold text-stone-500 dark:text-slate-400 mt-1 truncate">{label}</p>
      {caption && <p className="text-[11px] text-stone-400 dark:text-slate-500 mt-0.5 truncate">{caption}</p>}
    </div>
  );
}
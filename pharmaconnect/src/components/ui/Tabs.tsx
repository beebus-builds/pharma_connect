import { cn } from "@/lib/utils";

interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  label?: string;
}

/**
 * Segmented tab track.
 *
 * The pharmacy dashboard hand-rolled this four times, each copy repeating the
 * same selected/unselected class strings. One component keeps the selected
 * state, the count-badge slot and the focus ring consistent across every tab bar.
 */
export function Tabs({ value, onChange, children, className, label }: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex flex-wrap gap-1 p-1 bg-stone-100 dark:bg-slate-800 rounded-xl w-fit", className)}
    >
      {children}
    </div>
  );
}

interface TabProps {
  /** Matches the parent Tabs `value`. */
  value: string;
  active: boolean;
  onSelect: (value: string) => void;
  children: React.ReactNode;
  /** Numeric badge, e.g. pending request count. */
  count?: number;
  /** Alert styling for the count badge (pending work). */
  tone?: "default" | "alert";
  icon?: React.ReactNode;
}

export function Tab({ value, active, onSelect, children, count, tone = "default", icon }: TabProps) {
  return (
    <button
      role="tab"
      type="button"
      aria-selected={active}
      onClick={() => onSelect(value)}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/40",
        "motion-reduce:transition-none",
        active
          ? "bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-300 shadow-card"
          : "text-stone-500 hover:text-ink dark:text-slate-400 dark:hover:text-slate-200"
      )}
    >
      {icon}
      {children}
      {typeof count === "number" && count > 0 && (
        <span
          className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center tabular-nums",
            tone === "alert"
              ? "bg-red-600 text-white"
              : "bg-stone-200 text-stone-700 dark:bg-slate-600 dark:text-slate-200"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
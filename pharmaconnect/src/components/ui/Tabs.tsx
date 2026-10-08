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
      className={cn(
        "flex max-w-full gap-1 overflow-x-auto rounded-xl bg-surface-sunken p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
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
      // Roving arrow-key navigation, per the WAI-ARIA tabs pattern.
      onKeyDown={(event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        const list = event.currentTarget.closest('[role="tablist"]');
        if (!list) return;
        const tabs = [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
        const index = tabs.indexOf(event.currentTarget);
        const next = tabs[(index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
        next?.focus();
      }}
      onClick={() => onSelect(value)}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
        "motion-reduce:transition-none",
        active
          ? "bg-surface text-fg shadow-card"
          : "text-fg-muted hover:text-fg"
      )}
    >
      {icon}
      <span className="whitespace-nowrap">{children}</span>
      {typeof count === "number" && count > 0 && (
        <span
          className={cn(
            "tabular min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold",
            tone === "alert"
              ? "bg-red-600 text-white"
              : "bg-line text-fg-muted"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

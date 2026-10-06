"use client";

import { cn } from "@/lib/utils";

type ChipTone = "neutral" | "primary" | "danger";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  tone?: ChipTone;
  size?: "sm" | "md";
}

/**
 * The single control primitive for filter/sort/radius pickers.
 *
 * These used to be hand-rolled at seven call sites with three different radii and
 * three different active colors, so the homepage read as four unrelated control
 * groups. One component keeps the shape, the pressed state and the focus ring
 * identical everywhere.
 */
export function Chip({
  selected = false,
  tone = "neutral",
  size = "md",
  className,
  children,
  ...props
}: ChipProps) {
  const tones: Record<ChipTone, string> = {
    neutral: selected
      ? "bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white"
      : "bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:bg-stone-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800",
    primary: selected
      ? "bg-primary-700 text-white border-primary-700 dark:bg-primary-600 dark:border-primary-600"
      : "bg-white text-primary-700 border-primary-200 hover:border-primary-400 hover:bg-primary-50 dark:bg-slate-900 dark:text-primary-300 dark:border-primary-900/50 dark:hover:bg-primary-500/10",
    danger: selected
      ? "bg-red-600 text-white border-red-600"
      : "bg-white text-red-700 border-red-200 hover:border-red-400 hover:bg-red-50 dark:bg-slate-900 dark:text-red-300 dark:border-red-900/50 dark:hover:bg-red-500/10",
  };

  const sizes = {
    sm: "px-2.5 py-1 text-[11px] rounded-full",
    md: "px-3 py-1.5 text-xs rounded-full",
  };

  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 font-bold border transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-paper dark:focus-visible:ring-offset-slate-950",
        tone === "danger"
          ? "focus-visible:ring-red-500/50"
          : "focus-visible:ring-primary-600/40",
        "motion-reduce:transition-none",
        sizes[size],
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface ChipGroupProps {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Visually hide the label but keep it for screen readers. */
  hideLabel?: boolean;
}

/** Wraps a set of chips with its label and a shared pill track. */
export function ChipGroup({ label, icon, children, className, hideLabel }: ChipGroupProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "text-xs font-semibold text-stone-500 dark:text-slate-400 flex items-center gap-1 shrink-0",
          hideLabel && "sr-only"
        )}
      >
        {icon}
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
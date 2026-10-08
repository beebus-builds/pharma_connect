"use client";

import { cn } from "@/lib/utils";

type ChipTone = "neutral" | "accent" | "danger";

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
      ? "bg-fg text-fg-inverse border-fg"
      : "bg-surface text-fg-muted border-line hover:border-line-strong hover:bg-surface-sunken hover:text-fg",
    accent: selected
      ? "bg-accent text-accent-fg border-accent"
      : "bg-surface text-accent border-accent/25 hover:border-accent/50 hover:bg-accent-soft",
    danger: selected
      ? "bg-red-600 text-white border-red-600"
      : "bg-surface text-red-700 border-red-600/25 hover:border-red-500/50 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10",
  };

  const sizes = {
    sm: "h-7 px-2.5 text-[11px] rounded-full",
    md: "h-8 px-3 text-xs rounded-full",
  };

  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold border transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas",
        tone === "danger"
          ? "focus-visible:ring-red-500/50"
          : "focus-visible:ring-accent-ring/50",
        "motion-reduce:transition-none",
        "disabled:pointer-events-none disabled:opacity-50",
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
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-2", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1.5 text-xs font-semibold text-fg-muted",
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

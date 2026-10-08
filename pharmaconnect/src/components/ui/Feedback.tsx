"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, Info, TriangleAlert, CircleCheck, CircleX } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "error";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-fg-muted ring-line",
  info: "bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-400/20",
  success:
    "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-400/20",
  warning:
    "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/20",
  danger:
    "bg-red-50 text-red-900 ring-red-200 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-400/20",
  error:
    "bg-red-50 text-red-900 ring-red-200 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-400/20",
};

const icons: Record<Tone, typeof Info> = {
  neutral: Info,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleX,
  error: TriangleAlert,
};

interface AlertProps {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode | false;
  actions?: ReactNode;
  className?: string;
  /** `assertive` interrupts; `polite` waits. Use polite for anything non-urgent. */
  live?: "polite" | "assertive" | "off";
}

/**
 * Inline callout.
 *
 * Replaces the freehand `border-l-4 border-l-orange-500`, `text-green-500` and
 * `bg-amber-50` panels that had accumulated one per page, each with a different
 * severity colour.
 */
export function Alert({
  tone = "info",
  title,
  children,
  icon,
  actions,
  className,
  live = "polite",
}: AlertProps) {
  const Icon = icons[tone];
  return (
    <div
      role={live === "off" ? undefined : live === "assertive" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-xl px-3.5 py-3 text-sm ring-1 ring-inset",
        tones[tone],
        className
      )}
    >
      {icon !== false && (
        <span className="mt-0.5 shrink-0" aria-hidden="true">
          {icon ?? <Icon className="h-4 w-4" />}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold leading-snug">{title}</p>}
        {children && <div className={cn("leading-relaxed", title && "mt-0.5")}>{children}</div>}
        {actions && <div className="mt-2.5 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

interface ProgressProps {
  /** 0–100. Values outside are clamped so a bad calculation can't break layout. */
  value: number;
  label?: string;
  showValue?: boolean;
  tone?: "accent" | "success" | "warning" | "danger";
  size?: "sm" | "md";
  className?: string;
}

const barTones = {
  accent: "bg-accent",
  success: "bg-emerald-600 dark:bg-emerald-500",
  warning: "bg-amber-600 dark:bg-amber-500",
  danger: "bg-red-600 dark:bg-red-500",
} as const;

/** Determinate progress bar with a real `progressbar` role. */
export function Progress({
  value,
  label,
  showValue,
  tone = "accent",
  size = "md",
  className,
}: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value || 0)));
  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
          {label && <span className="font-medium text-fg-muted">{label}</span>}
          {showValue && <span className="tabular font-semibold text-fg">{clamped}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={typeof label === "string" ? label : undefined}
        className={cn(
          "w-full overflow-hidden rounded-full bg-line",
          size === "sm" ? "h-1.5" : "h-2"
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-spring",
            barTones[tone]
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

interface AccordionProps {
  items: { id: string; question: ReactNode; answer: ReactNode }[];
  /** Allow several panels open at once. */
  multiple?: boolean;
  className?: string;
}

/**
 * Disclosure list used for FAQs and detail panels.
 *
 * Built on `<button aria-expanded>` + a region instead of `<details>`, so the
 * chevron rotation, height transition and keyboard behaviour are the same
 * everywhere.
 */
export function Accordion({ items, multiple = false, className }: AccordionProps) {
  const [open, setOpen] = useState<string[]>([]);
  const baseId = useId();

  const toggle = (id: string) =>
    setOpen((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      return multiple ? [...current, id] : [id];
    });

  return (
    <div className={cn("divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface", className)}>
      {items.map((item) => {
        const expanded = open.includes(item.id);
        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`${baseId}-${item.id}`}
                id={`${baseId}-${item.id}-trigger`}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:-ring-inset focus-visible:ring-accent-ring sm:px-5"
              >
                <span className="text-[0.9375rem] font-semibold text-fg text-balance">
                  {item.question}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-fg-subtle transition-transform duration-200",
                    expanded && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </button>
            </h3>
            <div
              id={`${baseId}-${item.id}`}
              role="region"
              aria-labelledby={`${baseId}-${item.id}-trigger`}
              hidden={!expanded}
              className="px-4 pb-4 text-sm leading-relaxed text-fg-muted sm:px-5"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const avatarSizes = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
} as const;

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof avatarSizes;
  className?: string;
  /** Rendered instead of initials when the image fails to load. */
  fallback?: ReactNode;
}

/**
 * Avatar that degrades to initials.
 *
 * Initials are derived deterministically from the name so the same person always
 * gets the same swatch — the fallback is part of the identity, not a spinner.
 */
const swatches = [
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
];

export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function Avatar({ name, src, size = "md", className, fallback }: AvatarProps) {
  const initials = initialsOf(name);
  const swatch = swatches[
    [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0) % swatches.length
  ];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn(
          "shrink-0 rounded-full object-cover ring-1 ring-line",
          avatarSizes[size],
          className
        )}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold tracking-wide ring-1 ring-inset ring-black/5 dark:ring-white/5",
        swatch,
        avatarSizes[size],
        className
      )}
    >
      {fallback ?? initials}
    </span>
  );
}

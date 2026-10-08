import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "outline"
  | "accent";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon" | "icon-sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Stretch to the width of the container. */
  block?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-fg hover:bg-accent-hover shadow-xs active:translate-y-px focus-visible:ring-accent-ring",
  // Solid surface + hairline. The workhorse: reads correctly on any background.
  secondary:
    "bg-surface text-fg ring-1 ring-inset ring-line hover:bg-surface-sunken hover:ring-line-strong shadow-xs active:translate-y-px focus-visible:ring-accent-ring",
  ghost:
    "text-fg-muted hover:bg-surface-sunken hover:text-fg focus-visible:ring-accent-ring",
  danger:
    "bg-red-700 text-white hover:bg-red-800 shadow-xs active:translate-y-px focus-visible:ring-red-600 dark:bg-red-600 dark:hover:bg-red-500",
  outline:
    "bg-transparent text-fg ring-1 ring-inset ring-line-strong hover:bg-surface-sunken active:translate-y-px focus-visible:ring-accent-ring",
  // Emphasis for the single most important action on a screen.
  accent:
    "bg-surface-inverse text-fg-inverse hover:opacity-90 shadow-xs active:translate-y-px focus-visible:ring-fg-muted",
};

const sizes: Record<ButtonSize, string> = {
  // System scale: xs = dense tables, sm = chips / card actions, md = default,
  // lg = hero + forms, icon* = square icon-only controls.
  xs: "h-7 px-2.5 text-[11px] rounded-md gap-1",
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-[0.9375rem] rounded-xl gap-2",
  icon: "h-10 w-10 rounded-xl",
  "icon-sm": "h-8 w-8 rounded-lg",
};

const base =
  "inline-flex select-none items-center justify-center whitespace-nowrap font-semibold " +
  "transition-[background-color,color,box-shadow,transform] duration-150 ease-spring " +
  "disabled:opacity-50 disabled:pointer-events-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas " +
  "motion-reduce:transition-none motion-reduce:translate-y-0";

/**
 * Class list for a `<Link>` (or `<a>`) that should look like a button.
 *
 * `<Link><Button/></Link>` nests an interactive control inside another one, which
 * breaks keyboard activation and produces duplicate tab stops. This is the
 * supported way to get button styling onto a real anchor.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  block,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], block && "w-full", className);
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, disabled, block, children, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={buttonClasses({ variant, size, block, className })}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

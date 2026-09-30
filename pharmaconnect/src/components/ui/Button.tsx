import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", loading, disabled, children, ...props }, ref) => {
    const variants = {
      primary:
        "bg-primary-700 hover:bg-primary-800 text-white shadow-sm active:scale-[0.99] focus-visible:ring-primary-600",
      secondary:
        "bg-white hover:bg-stone-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-ink dark:text-slate-100 ring-1 ring-inset ring-stone-200 dark:ring-slate-700 shadow-sm active:scale-[0.99] focus-visible:ring-primary-600",
      ghost: "hover:bg-stone-100 dark:hover:bg-slate-800/80 text-stone-700 dark:text-slate-300 focus-visible:ring-slate-400",
      danger: "bg-red-700 hover:bg-red-800 text-white shadow-sm active:scale-[0.99] focus-visible:ring-red-600",
      outline:
        "ring-1 ring-inset ring-stone-300 dark:ring-slate-600 bg-transparent hover:bg-stone-100 dark:hover:bg-slate-800 active:scale-[0.99] focus-visible:ring-primary-600",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper dark:focus-visible:ring-offset-slate-950 motion-reduce:transition-none motion-reduce:active:scale-100",
          variants[variant],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

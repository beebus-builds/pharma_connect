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
        "bg-gradient-to-b from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-[0_1px_2px_rgb(15_23_42/0.08),0_8px_24px_-8px_rgb(39_150_129/0.5)] hover:shadow-[0_1px_2px_rgb(15_23_42/0.08),0_12px_32px_-8px_rgb(39_150_129/0.55)] active:scale-[0.98] focus-visible:ring-primary-500 ring-1 ring-inset ring-white/20",
      secondary:
        "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 ring-1 ring-inset ring-slate-200 dark:ring-slate-700 shadow-sm active:scale-[0.98] focus-visible:ring-primary-500",
      ghost: "hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 focus-visible:ring-slate-400",
      danger: "bg-gradient-to-b from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md shadow-red-600/20 active:scale-[0.98] focus-visible:ring-red-500 ring-1 ring-inset ring-white/20",
      outline:
        "border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 hover:border-primary-300 dark:hover:border-primary-700 active:scale-[0.98] focus-visible:ring-primary-500 shadow-sm",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold tracking-[-0.006em] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 motion-reduce:transition-none motion-reduce:active:scale-100",
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

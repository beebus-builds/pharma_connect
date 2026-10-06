import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
  variant?: "default" | "muted" | "interactive";
}

export function Card({ className, children, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white dark:bg-slate-900 transition-shadow duration-200 motion-reduce:transition-none",
        variant === "default" && "border-stone-200 dark:border-slate-800 shadow-card",
        variant === "muted" && "border-stone-200/70 dark:border-slate-800 bg-stone-50 dark:bg-slate-900/60 shadow-none",
        variant === "interactive" &&
          "border-stone-200 dark:border-slate-800 shadow-card hover:shadow-card-hover hover:border-stone-300 dark:hover:border-slate-700",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

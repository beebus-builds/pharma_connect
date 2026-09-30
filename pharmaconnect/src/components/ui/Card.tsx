import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card transition-shadow duration-200 motion-reduce:transition-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

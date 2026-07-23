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
        "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

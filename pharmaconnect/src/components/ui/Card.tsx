import { cn } from "@/lib/utils";

export function Card({ className, children, onClick }: { className?: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 shadow-sm",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

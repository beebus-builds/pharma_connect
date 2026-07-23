import { cn } from "@/lib/utils";

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn("w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900", className)}>
      <table className="w-full text-sm text-left">
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium uppercase tracking-wider text-xs">
      {children}
    </thead>
  );
}

export function TableRow({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <tr className={cn("border-b border-slate-100 dark:border-slate-800 last:border-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50", className)} style={style}>
      {children}
    </tr>
  );
}

export function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn("px-4 py-3 text-slate-700 dark:text-slate-300", className)}>
      {children}
    </td>
  );
}

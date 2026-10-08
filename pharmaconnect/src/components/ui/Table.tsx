import { cn } from "@/lib/utils";

interface TableProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Collapse to stacked definition rows below `sm`. Data tables are the single
   * worst thing about a mobile layout — horizontal scroll hides the status
   * column, which is usually the one people came to read. Cells get their
   * column name from `TableCell`'s `label` prop in that mode.
   */
  responsive?: boolean;
}

export function Table({ children, className, responsive = true }: TableProps) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-2xl border border-line bg-surface",
        responsive && "table-cards",
        className
      )}
    >
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return <thead className="bg-surface-sunken">{children}</thead>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <tr
      className={cn(
        "border-b border-line transition-colors last:border-0 hover:bg-surface-sunken/60",
        className
      )}
      style={style}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  /** Column name, surfaced as the row's key when the table stacks on mobile. */
  label?: string;
}) {
  return (
    <td data-label={label} className={cn("px-4 py-3 text-fg-muted", className)}>
      {children}
    </td>
  );
}

/** Header cell. Always a `<th scope="col">` so screen readers announce the column. */
export function TableHeadCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-line px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle",
        className
      )}
    >
      {children}
    </th>
  );
}

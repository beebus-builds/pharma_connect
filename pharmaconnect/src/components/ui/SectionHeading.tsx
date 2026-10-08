import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  /** Rendered on the title row, opposite the eyebrow — e.g. a "See all" link. */
  action?: React.ReactNode;
  className?: string;
}

/** Editorial section header: eyebrow + serif title + lede. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4",
        align === "center" && "mx-auto max-w-2xl flex-col items-center text-center",
        className
      )}
    >
      <div className={cn("min-w-0", align === "center" && "mx-auto max-w-2xl")}>
        {eyebrow && <p className={cn("eyebrow", align === "center" && "justify-center")}>{eyebrow}</p>}
        <h2 className="headline mt-1 font-display text-2xl text-ink text-balance sm:text-3xl">{title}</h2>
        {description && (
          <p className="lede mt-2 max-w-[62ch] text-sm text-stone-600 sm:text-base dark:text-slate-300">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

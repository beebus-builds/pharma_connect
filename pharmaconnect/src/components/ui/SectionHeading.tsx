import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

/** Editorial section header: eyebrow + serif title + lede. */
export function SectionHeading({ eyebrow, title, description, align = "left", className }: SectionHeadingProps) {
  return (
    <div className={cn("min-w-0", align === "center" && "text-center mx-auto max-w-2xl", className)}>
      {eyebrow && <p className={cn("eyebrow", align === "center" && "justify-center")}>{eyebrow}</p>}
      <h2 className="headline font-display text-2xl sm:text-3xl text-ink dark:text-white mt-1 text-balance">{title}</h2>
      {description && (
        <p className="lede text-sm sm:text-base text-stone-600 dark:text-slate-300 mt-2 max-w-[62ch]">{description}</p>
      )}
    </div>
  );
}

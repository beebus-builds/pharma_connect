import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "muted" | "interactive" | "outline" | "glass";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Optional eyebrow label rendered above the body, for titled panels. */
  title?: string;
  description?: string;
  /** Render the card as a <section> so landmarks are announced correctly. */
  as?: "div" | "section" | "article" | "aside";
}

/**
 * The single surface primitive.
 *
 * Every page used to hand-roll its own card treatment — `border-slate-200`,
 * `border-stone-200/70`, `ring-1 ring-slate-200/80` — which is why cards drifted
 * apart at the seams. All of that lives here now.
 */
export function Card({
  className,
  children,
  variant = "default",
  title,
  description,
  as: Tag = "div",
  ...props
}: CardProps) {
  return (
    <Tag
      className={cn(
        "relative rounded-2xl border transition-[box-shadow,border-color,background-color] duration-200 motion-reduce:transition-none",
        variant === "default" && "border-line bg-surface shadow-card",
        variant === "outline" && "border-line bg-transparent",
        variant === "muted" && "border-line bg-surface-sunken",
        variant === "glass" && "border-line bg-surface/70 backdrop-blur-xl backdrop-saturate-150",
        variant === "interactive" &&
          "border-line bg-surface shadow-card cursor-pointer hover:border-line-strong hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        className
      )}
      {...props}
    >
      {(title || description) && (
        <div className="border-b border-line px-4 py-3.5 sm:px-5">
          {title && (
            <h3 className="font-display text-base font-semibold text-fg text-balance">{title}</h3>
          )}
          {description && <p className="text-sm text-fg-muted mt-0.5">{description}</p>}
        </div>
      )}
      {children}
    </Tag>
  );
}

/** Header row for a panel: title on the left, actions on the right. */
export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5",
        className
      )}
    >
      <div className="min-w-0">
        <h3 className="font-display text-base font-semibold text-fg truncate">{title}</h3>
        {description && <p className="text-sm text-fg-muted mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 sm:p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3 sm:px-5",
        className
      )}
      {...props}
    />
  );
}

/** Small uppercase label used above groups inside a card. */
export function CardLabel({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-[11px] font-bold uppercase tracking-[0.12em] text-fg-subtle",
        className
      )}
      {...props}
    />
  );
}

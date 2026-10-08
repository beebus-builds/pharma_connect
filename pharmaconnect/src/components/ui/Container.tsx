import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** `wide` is the 7xl grid used by the homepage map split. */
  wide?: boolean;
  as?: "div" | "section" | "main" | "nav" | "header" | "footer";
}

/**
 * Single source of truth for page width + gutters.
 *
 * Every page used to re-type `max-w-* mx-auto px-4 py-*`, which is how the same
 * content ended up at five different widths depending on where you were.
 */
export function Container({
  wide,
  as: Tag = "div",
  className,
  children,
  ...props
}: ContainerProps) {
  return (
    <Tag className={cn(wide ? "container-wide" : "container-app", className)} {...props}>
      {children}
    </Tag>
  );
}

/**
 * Vertical rhythm for a page section.
 *
 * `page` is the outer rhythm for full-width bands; `section` is for blocks inside
 * a page. One scale instead of `py-16` / `py-20` / `py-24` picked per page.
 */
export function Section({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("py-14 sm:py-20", className)} {...props}>
      {children}
    </section>
  );
}

/** Consistent vertical gap between stacked blocks in a page. */
export function Stack({
  className,
  children,
  gap = "md",
  ...props
}: HTMLAttributes<HTMLDivElement> & { gap?: "sm" | "md" | "lg" }) {
  const gaps = { sm: "space-y-3", md: "space-y-5 sm:space-y-6", lg: "space-y-8 sm:space-y-10" };
  return (
    <div className={cn(gaps[gap], className)} {...props}>
      {children}
    </div>
  );
}

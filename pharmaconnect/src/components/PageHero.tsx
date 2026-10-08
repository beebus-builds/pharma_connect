"use client";

import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  /** Small uppercase pill above the title. */
  badge: string;
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  /** Extra content under the subtitle — e.g. a pair of CTAs. */
  children?: ReactNode;
  className?: string;
}

/**
 * Shared marketing hero.
 *
 * The mesh wash + centered display headline that opened `/how-it-works` is
 * pulled out here so every public page opens the same way instead of each one
 * re-typing the gradient, the badge pill and the clamp.
 */
export function PageHero({ badge, icon: Icon, title, subtitle, children, className }: PageHeroProps) {
  return (
    <section className={cn("relative overflow-hidden border-b border-line", className)}>
      <div className="mesh pointer-events-none absolute inset-0" aria-hidden="true" />
      <Container className="relative py-14 text-center sm:py-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-accent backdrop-blur">
          {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
          {badge}
        </span>
        <h1 className="headline text-display mx-auto mt-5 max-w-3xl font-display text-fg">{title}</h1>
        {subtitle && (
          <p className="lede mx-auto mt-4 max-w-2xl text-base text-fg-muted sm:text-lg">{subtitle}</p>
        )}
        {children}
      </Container>
    </section>
  );
}

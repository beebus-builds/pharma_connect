"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ListOrdered, TriangleAlert } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/PageHero";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/LocaleProvider";

interface GenericItem {
  name: string;
  slug: string;
  variants: number;
}

export default function MedicineAZView({
  generics,
  totalVariants,
  available,
}: {
  generics: GenericItem[];
  totalVariants: number;
  available: boolean;
}) {
  const { t } = useLocale();

  const groups = useMemo(() => {
    const map = new Map<string, GenericItem[]>();
    for (const generic of generics) {
      const raw = generic.name.trim()[0]?.toUpperCase() ?? "#";
      const letter = /[A-Z]/.test(raw) ? raw : "#";
      const bucket = map.get(letter) ?? [];
      bucket.push(generic);
      map.set(letter, bucket);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [generics]);

  const letters = groups.map(([letter]) => letter);

  return (
    <Container className="py-8 sm:py-10">
      <PageHero
        icon={ListOrdered}
        badge={t("az.eyebrow")}
        title={t("az.title")}
        subtitle={t("az.description")}
      />

      {!available ? (
        <EmptyState
          tone="error"
          className="mt-8"
          icon={TriangleAlert}
          title={t("az.unavailableTitle")}
          body={t("az.unavailableBody")}
        />
      ) : generics.length === 0 ? (
        <EmptyState className="mt-8" icon={ListOrdered} title={t("az.emptyTitle")} body={t("az.emptyBody")} />
      ) : (
        <>
          <p className="tabular mt-6 text-sm text-fg-muted">
            {t("az.count", { generics: generics.length, products: totalVariants })}
          </p>

          {/* Sticky letter jump bar. */}
          <nav
            aria-label={t("az.jump")}
            className="sticky top-16 z-30 -mx-4 mt-4 mb-6 border-b border-line bg-canvas/85 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6"
          >
            <ul className="flex flex-wrap gap-1">
              {letters.map((letter) => (
                <li key={letter}>
                  <a
                    href={`#az-${letter.toLowerCase()}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold text-fg-muted transition-colors hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                  >
                    {letter}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-8">
            {groups.map(([letter, items]) => (
              <Reveal key={letter}>
                <section id={`az-${letter.toLowerCase()}`} className="scroll-mt-32">
                  <h2 className="headline font-display text-2xl text-fg">{letter}</h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {items.map((generic) => (
                      <li key={generic.slug}>
                        <Link
                          href={`/medicines/${generic.slug}`}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg",
                            "transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                          )}
                        >
                          {generic.name}
                          <span className="tabular text-xs text-fg-subtle">
                            {t("az.variants", { count: generic.variants })}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              </Reveal>
            ))}
          </div>
        </>
      )}
    </Container>
  );
}

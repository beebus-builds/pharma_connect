"use client";

import Link from "next/link";
import { HeartPulse, type LucideIcon } from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PageHero } from "@/components/PageHero";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { CtaBand } from "@/components/CtaBand";
import { useLocale } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

interface Item { generic: string; href: string }
interface Group { key: string; hint: string; items: Item[] }

export default function EssentialMedicinesView({ groups, catalogCount }: { groups: Group[]; catalogCount: number }) {
  const { t } = useLocale();

  return (
    <div>
      <PageHero
        icon={HeartPulse}
        badge={t("ess.badge")}
        title={t("ess.title")}
        subtitle={t("ess.subtitle")}
      />

      <Section>
        <Container>
          <Reveal className="mx-auto max-w-3xl space-y-4 text-sm leading-relaxed text-fg-muted">
            <p>{t("ess.intro", { count: String(catalogCount) })}</p>
            <p className="rounded-2xl border border-amber-300/60 bg-amber-50 p-4 font-medium text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
              {t("ess.notMedical")}
            </p>
          </Reveal>
        </Container>
      </Section>

      {groups.map((g, i) => (
        <Section key={g.key} className={i % 2 === 1 ? "border-t border-line bg-surface-sunken" : "border-t border-line"}>
          <Container>
            <Reveal className="mb-4">
              <h2 className="font-display text-xl font-semibold text-fg">
                {t(`ess.group.${g.key}` as MessageKey)}
              </h2>
              <p className="mt-1 text-sm text-fg-muted">{g.hint}</p>
            </Reveal>
            <ul className="flex flex-wrap gap-2">
              {g.items.map((it) => (
                <li key={it.generic}>
                  <Link
                    href={it.href}
                    className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-fg-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                  >
                    {it.generic}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ))}

      <CtaBand
        title={t("ess.ctaTitle")}
        body={t("ess.ctaBody")}
        primary={{ href: "/medicines", label: t("footer.browseCatalog") }}
        secondary={{ href: "/pharmacies", label: "Directory" }}
      />
    </div>
  );
}

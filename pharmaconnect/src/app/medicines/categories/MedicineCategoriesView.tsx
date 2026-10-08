"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Flame,
  Bug,
  Droplets,
  Wind,
  UtensilsCrossed,
  Syringe,
  HeartPulse,
  Waves,
  Apple,
  Activity,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { PageHero } from "@/components/PageHero";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Feedback";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";
import { slugifyGeneric } from "@/lib/seo";
import { useLocale } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

interface Category {
  id: string;
  icon: LucideIcon;
  titleKey: MessageKey;
  descKey: MessageKey;
  /** Generic names. In-catalog items link to their page; others to a search. */
  items: string[];
}

/** Grouping follows the WHO Model List of Essential Medicines categories. */
const CATEGORIES: Category[] = [
  {
    id: "pain",
    icon: Flame,
    titleKey: "cat.pain.title",
    descKey: "cat.pain.desc",
    items: ["Paracetamol", "Ibuprofen", "Aspirin", "Diclofenac", "Naproxen", "Mefenamic acid"],
  },
  {
    id: "antibiotics",
    icon: Bug,
    titleKey: "cat.antibiotics.title",
    descKey: "cat.antibiotics.desc",
    items: ["Amoxicillin", "Co-amoxiclav", "Azithromycin", "Ciprofloxacin", "Doxycycline", "Cephalexin"],
  },
  {
    id: "diarrhoea",
    icon: Droplets,
    titleKey: "cat.diarrhoea.title",
    descKey: "cat.diarrhoea.desc",
    items: ["ORS", "Oral Rehydration Salts", "Zinc", "Loperamide", "Metronidazole"],
  },
  {
    id: "allergy",
    icon: Wind,
    titleKey: "cat.allergy.title",
    descKey: "cat.allergy.desc",
    items: ["Cetirizine", "Loratadine", "Chlorpheniramine", "Pseudoephedrine"],
  },
  {
    id: "stomach",
    icon: UtensilsCrossed,
    titleKey: "cat.stomach.title",
    descKey: "cat.stomach.desc",
    items: ["Omeprazole", "Pantoprazole", "Domperidone", "Ondansetron", "Antacid"],
  },
  {
    id: "diabetes",
    icon: Syringe,
    titleKey: "cat.diabetes.title",
    descKey: "cat.diabetes.desc",
    items: ["Metformin", "Glimepiride", "Gliclazide"],
  },
  {
    id: "heart",
    icon: HeartPulse,
    titleKey: "cat.heart.title",
    descKey: "cat.heart.desc",
    items: ["Amlodipine", "Losartan", "Telmisartan", "Enalapril", "Atorvastatin", "Aspirin"],
  },
  {
    id: "respiratory",
    icon: Waves,
    titleKey: "cat.respiratory.title",
    descKey: "cat.respiratory.desc",
    items: ["Salbutamol", "Montelukast", "Theophylline", "Budesonide"],
  },
  {
    id: "vitamins",
    icon: Apple,
    titleKey: "cat.vitamins.title",
    descKey: "cat.vitamins.desc",
    items: ["Vitamin C", "Vitamin D", "Calcium", "Ferrous", "Zinc", "Multivitamin"],
  },
  {
    id: "thyroid",
    icon: Activity,
    titleKey: "cat.thyroid.title",
    descKey: "cat.thyroid.desc",
    items: ["Levothyroxine", "Carbimazole"],
  },
];

export default function MedicineCategoriesView({ catalog }: { catalog: string[] | null }) {
  const { t } = useLocale();
  const catalogSet = useMemo(() => new Set(catalog ?? []), [catalog]);

  const hrefFor = (name: string) => {
    const inCatalog = catalogSet.has(name.toLowerCase());
    return inCatalog
      ? `/medicines/${slugifyGeneric(name)}`
      : `/?q=${encodeURIComponent(name)}#pharmacies`;
  };

  return (
    <div>
      <PageHero icon={Flame} badge={t("cat.badge")} title={t("cat.title")} subtitle={t("cat.subtitle")} />

      <Section>
        <Container>
          <Alert tone="warning" className="mb-8" title={t("cat.rxNoteTitle")}>
            {t("cat.rxNoteBody")}
          </Alert>

          {catalog === null && (
            <EmptyState
              tone="error"
              className="mt-4"
              icon={TriangleAlert}
              title={t("az.unavailableTitle")}
              body={t("az.unavailableBody")}
            />
          )}

          <div className="space-y-10">
            {CATEGORIES.map(({ id, icon: Icon, titleKey, descKey, items }, i) => (
              <Reveal key={id} delay={Math.min(i, 5) * 0.05}>
                <section className="border-line">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-fg">{t(titleKey)}</h2>
                      <p className="text-sm text-fg-muted">{t(descKey)}</p>
                    </div>
                  </div>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {items.map((name) => {
                      const known = catalogSet.has(name.toLowerCase());
                      return (
                        <li key={name}>
                          <Link
                            href={hrefFor(name)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
                              known
                                ? "text-fg hover:border-accent/40 hover:bg-accent-soft hover:text-accent"
                                : "text-fg-muted hover:border-line-strong hover:text-fg"
                            )}
                          >
                            {name}
                            {!known && <span className="sr-only">{t("cat.searchInstead")}</span>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </Reveal>
            ))}
          </div>

          <p className="mt-10 text-xs leading-relaxed text-fg-subtle">{t("cat.reference")}</p>
        </Container>
      </Section>
    </div>
  );
}

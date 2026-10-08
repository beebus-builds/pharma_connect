"use client";

import Link from "next/link";
import {
  Search,
  MapPin,
  Send,
  CheckCircle2,
  PackageCheck,
  TrendingUp,
  Stethoscope,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { PageHero } from "@/components/PageHero";
import { useLocale } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

interface Step {
  icon: LucideIcon;
  title: MessageKey;
  body: MessageKey;
}

/**
 * One step list, rendered once per audience.
 *
 * The two columns previously had near-identical data *and* two identical render
 * blocks, so any copy fix had to be made four times and drifted every time.
 */
const PATIENT_STEPS: Step[] = [
  { icon: Search, title: "guide.p1Title", body: "guide.p1Body" },
  { icon: MapPin, title: "guide.p2Title", body: "guide.p2Body" },
  { icon: Send, title: "guide.p3Title", body: "guide.p3Body" },
  { icon: CheckCircle2, title: "guide.p4Title", body: "guide.p4Body" },
];

const PHARMACY_STEPS: Step[] = [
  { icon: PackageCheck, title: "guide.ph1Title", body: "guide.ph1Body" },
  { icon: Send, title: "guide.ph2Title", body: "guide.ph2Body" },
  { icon: CheckCircle2, title: "guide.ph3Title", body: "guide.ph3Body" },
  { icon: TrendingUp, title: "guide.ph4Title", body: "guide.ph4Body" },
];

function StepColumn({
  heading,
  icon: HeadingIcon,
  steps,
  ctaHref,
  ctaLabel,
  tone,
}: {
  heading: string;
  icon: LucideIcon;
  steps: Step[];
  ctaHref: string;
  ctaLabel: string;
  tone: "patient" | "pharmacy";
}) {
  const { t } = useLocale();
  return (
    <Card className="h-full p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            tone === "patient"
              ? "bg-accent-soft text-accent"
              : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          }`}
        >
          <HeadingIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="font-display text-xl font-semibold text-fg">{heading}</h2>
      </div>

      <ol className="mt-7 space-y-6">
        {steps.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-sm font-semibold text-fg-muted">
                {i + 1}
              </span>
              {i < steps.length - 1 && <span className="mt-1 w-px flex-1 bg-line" aria-hidden="true" />}
            </div>
            <div className="min-w-0 pb-1">
              <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-fg">
                <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {t(title)}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">{t(body)}</p>
            </div>
          </li>
        ))}
      </ol>

      <Link
        href={ctaHref}
        className={buttonClasses({
          block: true,
          variant: tone === "patient" ? "primary" : "secondary",
          className: "mt-8",
        })}
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </Card>
  );
}

export default function HowItWorksPage() {
  const { t } = useLocale();

  return (
    <div>
      <PageHero
        icon={Stethoscope}
        badge={t("guide.badge")}
        title={t("guide.title")}
        subtitle={t("guide.subtitle")}
      />

      <Section>
        <Container>
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <Reveal className="h-full">
              <StepColumn
                heading={t("guide.forPatients")}
                icon={Search}
                steps={PATIENT_STEPS}
                ctaHref="/"
                ctaLabel={t("guide.startSearching")}
                tone="patient"
              />
            </Reveal>
            <Reveal delay={0.1} className="h-full">
              <StepColumn
                heading={t("guide.forPharmacies")}
                icon={PackageCheck}
                steps={PHARMACY_STEPS}
                ctaHref="/register"
                ctaLabel={t("guide.joinPharmacy")}
                tone="pharmacy"
              />
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section className="border-t border-line bg-surface-sunken">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t("details.faqTitle")}
              title={t("details.faqSubtitle")}
              align="center"
              className="mb-8"
            />
          </Reveal>
          <Reveal delay={0.05}>
            <div className="grid gap-3 text-sm text-fg-muted sm:grid-cols-2">
              {(
                [
                  ["details.faq1", "guide.shortAnswer"],
                  ["details.faq2", "guide.callFirst"],
                  ["details.faq3", "guide.noOnlineOrders"],
                  ["details.faq4", "guide.licenceCheck"],
                ] as const
              ).map(([key, summaryKey]) => (
                <Link
                  key={key}
                  href="/#faq"
                  className="group rounded-2xl border border-line bg-surface p-4 transition-[box-shadow,border-color] hover:border-line-strong hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                >
                  <p className="text-[0.9375rem] font-semibold text-fg group-hover:text-accent">
                    {t(`${key}.q` as MessageKey)}
                  </p>
                  <p className="mt-1.5 line-clamp-2 leading-relaxed">{t(summaryKey)}</p>
                </Link>
              ))}
            </div>
            <p className="mt-6 text-center text-sm">
              <Link
                href="/"
                className="rounded font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
              >
                {t("details.guide")}
              </Link>
            </p>
          </Reveal>
        </Container>
      </Section>
    </div>
  );
}

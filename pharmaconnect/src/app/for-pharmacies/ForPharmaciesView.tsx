"use client";

import Link from "next/link";
import {
  Store,
  PackageSearch,
  MessageCircle,
  Send,
  TrendingUp,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Feedback";
import { buttonClasses } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";
import { PlanGrid } from "@/components/PlanGrid";
import { useLocale } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

interface Step {
  icon: LucideIcon;
  title: MessageKey;
  body: MessageKey;
}

// Benefits reuse the shared "for pharmacies" copy; nothing is duplicated here.
const BENEFITS: Step[] = [
  { icon: Store, title: "details.pharm1.title", body: "details.pharm1.desc" },
  { icon: PackageSearch, title: "details.pharm2.title", body: "details.pharm2.desc" },
  { icon: MessageCircle, title: "details.pharm3.title", body: "details.pharm3.desc" },
  { icon: TrendingUp, title: "guide.ph4Title", body: "guide.ph4Body" },
];

const STEPS: Step[] = [
  { icon: Store, title: "guide.ph1Title", body: "guide.ph1Body" },
  { icon: PackageSearch, title: "guide.ph2Title", body: "guide.ph2Body" },
  { icon: Send, title: "guide.ph3Title", body: "guide.ph3Body" },
  { icon: TrendingUp, title: "guide.ph4Title", body: "guide.ph4Body" },
];

export default function ForPharmaciesView() {
  const { t } = useLocale();

  return (
    <div>
      <PageHero icon={Store} badge={t("forPharm.badge")} title={t("forPharm.title")} subtitle={t("forPharm.subtitle")}>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className={buttonClasses({ size: "lg" })}>
            {t("details.pharmacyCta")}
          </Link>
          <Link href="#plans" className={buttonClasses({ variant: "secondary", size: "lg" })}>
            {t("forPharm.seePlans")}
          </Link>
        </div>
      </PageHero>

      {/* Benefits */}
      <Section>
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t("forPharm.benefitsEyebrow")}
              title={t("forPharm.benefitsTitle")}
              description={t("forPharm.benefitsSubtitle")}
            />
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {BENEFITS.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 0.07} className="h-full">
                <Card className="h-full p-5 sm:p-6" variant="muted">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold text-fg">{t(title)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{t(body)}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* How it works */}
      <Section className="border-y border-line bg-surface-sunken">
        <Container>
          <Reveal>
            <SectionHeading eyebrow={t("forPharm.howTitle")} title={t("guide.forPharmacies")} />
          </Reveal>
          <div className="mt-10">
            <Card className="p-6 sm:p-8">
              <ol className="space-y-6">
                {STEPS.map(({ icon: Icon, title, body }, i) => (
                  <Reveal key={title} delay={i * 0.06}>
                    <li className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                        </span>
                        {i < STEPS.length - 1 && (
                          <span className="mt-1 w-px flex-1 bg-line" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0 pb-1">
                        <p className="flex items-baseline gap-2 text-[0.9375rem] font-semibold text-fg">
                          <span className="tabular font-display text-xs text-fg-subtle">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {t(title)}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-fg-muted">{t(body)}</p>
                      </div>
                    </li>
                  </Reveal>
                ))}
              </ol>
            </Card>
          </div>
        </Container>
      </Section>

      {/* Plans */}
      <Section id="plans">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t("plans.eyebrow")}
              title={t("plans.title")}
              description={t("plans.subtitle")}
              align="center"
            />
          </Reveal>
          <Reveal className="mt-10">
            <PlanGrid />
          </Reveal>
          <Reveal className="mx-auto mt-6 max-w-2xl">
            <Alert tone="info" icon={<ShieldCheck className="h-4 w-4" />}>
              <span className="font-semibold">{t("plans.secureTitle")}.</span> {t("plans.secureBody")}
            </Alert>
            <p className="mt-4 text-center text-xs text-fg-subtle">{t("plans.footnote")}</p>
          </Reveal>
        </Container>
      </Section>

      <CtaBand
        title={t("guide.forPharmacies")}
        body={t("plans.subtitle")}
        primary={{ href: "/register", label: t("details.pharmacyCta") }}
        secondary={{ href: "/pricing", label: t("nav.pricing") }}
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import {
  Search,
  MessageCircle,
  BadgeCheck,
  ShieldCheck,
  Store,
  Users,
  PackageSearch,
  ArrowRight,
} from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { Accordion, Alert } from "@/components/ui/Feedback";
import { Reveal } from "@/components/ui/Reveal";
import { PlanGrid } from "@/components/PlanGrid";
import { useLocale } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

const PATIENT_STEPS: { title: MessageKey; desc: MessageKey; icon: typeof Search }[] = [
  { title: "details.step1.title", desc: "details.step1.desc", icon: Search },
  { title: "details.step2.title", desc: "details.step2.desc", icon: Store },
  { title: "details.step3.title", desc: "details.step3.desc", icon: MessageCircle },
];

const PHARMACY_STEPS: { title: MessageKey; desc: MessageKey; icon: typeof Search }[] = [
  { title: "details.pharm1.title", desc: "details.pharm1.desc", icon: Store },
  { title: "details.pharm2.title", desc: "details.pharm2.desc", icon: PackageSearch },
  { title: "details.pharm3.title", desc: "details.pharm3.desc", icon: BadgeCheck },
];

const TRUST_POINTS: { icon: typeof ShieldCheck; title: MessageKey; body: MessageKey }[] = [
  { icon: BadgeCheck, title: "trust.verifiedTitle", body: "trust.verifiedBody" },
  { icon: ShieldCheck, title: "trust.reportTitle", body: "trust.reportBody" },
  { icon: Users, title: "trust.freeTitle", body: "trust.freeBody" },
];

const FAQ_KEYS = ["details.faq1", "details.faq2", "details.faq3", "details.faq4", "details.faq5"] as const;

/** One step list, rendered once for each audience. */
function Steps({
  steps,
  label,
}: {
  steps: { title: MessageKey; desc: MessageKey; icon: typeof Search }[];
  label: string;
}) {
  const { t } = useLocale();
  return (
    <div>
      <h3 className="font-display text-lg font-semibold text-fg">{label}</h3>
      <ol className="mt-5 space-y-5">
        {steps.map(({ title, desc, icon: Icon }, index) => (
          <li key={title} className="flex gap-4">
            <div className="relative flex flex-col items-center">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent ring-1 ring-inset ring-accent/15">
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              {index < steps.length - 1 && (
                <span className="mt-1 w-px flex-1 bg-line" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 pb-1">
              <p className="flex items-baseline gap-2 text-[0.9375rem] font-semibold text-fg">
                <span className="tabular font-display text-xs text-fg-subtle">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {t(title)}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">{t(desc)}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function HomepageDetails() {
  const { t } = useLocale();

  return (
    <>
      {/* --------------------------------------------------------- Trust band */}
      <Section className="border-y border-line bg-surface-sunken">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t("trust.eyebrow")}
              title={t("trust.title")}
              description={t("trust.subtitle")}
              align="center"
            />
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {TRUST_POINTS.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 0.07} className="h-full">
                <Card className="h-full p-5" variant="default">
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

      {/* ------------------------------------------------------------- Steps */}
      <Section>
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t("details.title")}
              title={t("details.subtitle")}
              description={t("details.description")}
            />
          </Reveal>
          <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal delay={0.05} className="h-full">
              <Card className="h-full p-6 sm:p-8">
                <Steps steps={PATIENT_STEPS} label={t("details.forPatients")} />
                <Link href="/login" className={`${buttonClasses({ block: true })} mt-7`}>
                  {t("details.patientCta")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Card>
            </Reveal>
            <Reveal delay={0.12} className="h-full">
              <Card className="h-full p-6 sm:p-8">
                <Steps steps={PHARMACY_STEPS} label={t("details.forPharmacies")} />
                <Link
                  href="/register"
                  className={`${buttonClasses({ variant: "secondary", block: true })} mt-7`}
                >
                  {t("details.pharmacyCta")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Card>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* ---------------------------------------------------------- Pharmacy */}
      <Section className="border-y border-line bg-surface-sunken">
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
          <Reveal>
            <p className="mt-6 text-center text-xs text-fg-subtle">{t("plans.footnote")}</p>
          </Reveal>
        </Container>
      </Section>

      {/* --------------------------------------------------------------- FAQ */}
      <Section id="faq" className="scroll-mt-24">
        <Container className="max-w-3xl">
          <Reveal>
            <SectionHeading
              eyebrow={t("details.faqTitle")}
              title={t("details.faqSubtitle")}
              align="center"
              className="mb-8"
            />
            <Accordion
              items={FAQ_KEYS.map((key) => ({
                id: key,
                question: t(`${key}.q` as MessageKey),
                answer: t(`${key}.a` as MessageKey),
              }))}
            />

            <Alert tone="warning" className="mt-6" title={t("details.disclaimerTitle")}>
              {t("details.disclaimerBody")}
            </Alert>
          </Reveal>
        </Container>
      </Section>

      {/* --------------------------------------------------------------- CTA */}
      <Section className="border-t border-line">
        <Container>
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-surface-inverse px-6 py-14 text-center text-fg-inverse sm:px-12 sm:py-20">
              <div className="mesh pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
              <div className="relative">
                <h2 className="headline text-display font-display">
                  {t("details.ctaLine1")} {t("details.ctaLine2")}
                </h2>
                <p className="lede mx-auto mt-4 max-w-xl text-sm opacity-80 sm:text-base">
                  {t("details.ctaBody")}
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link href="/" className={buttonClasses({ variant: "secondary", size: "lg" })}>
                    {t("details.findNow")}
                  </Link>
                  <Link
                    href="/register"
                    className={buttonClasses({
                      size: "lg",
                      className:
                        "bg-white/10 text-white ring-1 ring-inset ring-white/25 hover:bg-white/20",
                    })}
                  >
                    {t("details.joinPharmacy")}
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}

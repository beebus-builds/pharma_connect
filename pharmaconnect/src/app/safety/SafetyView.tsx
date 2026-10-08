"use client";

import Link from "next/link";
import {
  ShieldCheck,
  CircleCheck,
  CircleX,
  PhoneCall,
  Clock,
  FileText,
  Pill,
  Flag,
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
import { useLocale } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

// tip1 reuses the existing "call first" guidance; the rest are safety-specific.
const TIPS: { icon: LucideIcon; title: MessageKey; body: MessageKey }[] = [
  { icon: PhoneCall, title: "safety.tip1Title", body: "guide.callFirst" },
  { icon: Clock, title: "safety.tip2Title", body: "safety.tip2Body" },
  { icon: FileText, title: "safety.tip3Title", body: "safety.tip3Body" },
  { icon: Pill, title: "safety.tip4Title", body: "safety.tip4Body" },
];

export default function SafetyView() {
  const { t } = useLocale();

  return (
    <div>
      <PageHero
        icon={ShieldCheck}
        badge={t("safety.badge")}
        title={t("safety.title")}
        subtitle={t("safety.subtitle")}
      />

      {/* What it does / does not do */}
      <Section>
        <Container>
          <div className="grid gap-4 lg:grid-cols-2">
            <Reveal className="h-full">
              <Card className="h-full p-5 sm:p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <CircleCheck className="h-[18px] w-[18px]" aria-hidden="true" />
                </div>
                <h2 className="mt-4 font-display text-lg font-semibold text-fg">
                  {t("safety.scopeTitle")}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{t("safety.scopeBody")}</p>
              </Card>
            </Reveal>
            <Reveal delay={0.08} className="h-full">
              <Card className="h-full p-5 sm:p-6" variant="muted">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  <CircleX className="h-[18px] w-[18px]" aria-hidden="true" />
                </div>
                <h2 className="mt-4 font-display text-lg font-semibold text-fg">
                  {t("safety.scopeNotTitle")}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                  {t("details.disclaimerBody")}
                </p>
              </Card>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* Before you travel */}
      <Section className="border-y border-line bg-surface-sunken">
        <Container>
          <Reveal>
            <SectionHeading title={t("safety.tipsTitle")} />
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {TIPS.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 0.07} className="h-full">
                <Card className="h-full p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <h3 className="font-display text-base font-semibold text-fg">{t(title)}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-fg-muted">{t(body)}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* Emergency + reporting + disclaimer */}
      <Section>
        <Container className="max-w-3xl">
          <Reveal className="space-y-6">
            <Alert tone="danger" title={t("safety.emergencyTitle")} icon={<PhoneCall className="h-4 w-4" />}>
              {t("safety.emergencyBody")}
            </Alert>

            <Card variant="muted" className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Flag className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <h3 className="font-display text-base font-semibold text-fg">{t("trust.reportTitle")}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">{t("trust.reportBody")}</p>
              <Link href="/#pharmacies" className={`${buttonClasses({ variant: "secondary", size: "sm", className: "mt-4" })}`}>
                {t("details.findNow")}
              </Link>
            </Card>

            <Alert tone="warning" title={t("details.disclaimerTitle")}>
              {t("details.disclaimerBody")}
            </Alert>
          </Reveal>
        </Container>
      </Section>

      <CtaBand
        title={t("about.ctaTitle")}
        body={t("about.ctaBody")}
        primary={{ href: "/", label: t("details.findNow") }}
        secondary={{ href: "/how-it-works", label: t("nav.howItWorks") }}
      />
    </div>
  );
}

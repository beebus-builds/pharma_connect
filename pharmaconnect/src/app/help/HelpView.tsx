"use client";

import Link from "next/link";
import {
  Mail,
  UserCircle2,
  Store,
  ShieldAlert,
  BookOpen,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PageHero } from "@/components/PageHero";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { CtaBand } from "@/components/CtaBand";
import { buttonClasses } from "@/components/ui/Button";
import { legalSupportEmail } from "@/lib/legal";
import { useLocale } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

interface LinkCard {
  icon: LucideIcon;
  title: MessageKey;
  body: MessageKey;
  href: string;
}

const CARDS: LinkCard[] = [
  {
    icon: BookOpen,
    title: "help.startSearchTitle",
    body: "help.startSearchBody",
    href: "/how-it-works",
  },
  {
    icon: Store,
    title: "help.pharmacyOnboardingTitle",
    body: "help.pharmacyOnboardingBody",
    href: "/for-pharmacies",
  },
  {
    icon: UserCircle2,
    title: "help.accountTitle",
    body: "help.accountBody",
    href: "/register",
  },
  {
    icon: ShieldAlert,
    title: "help.emergencyTitle",
    body: "help.emergencyBody",
    href: "/emergency",
  },
];

export default function HelpView() {
  const { t } = useLocale();
  const supportEmail = legalSupportEmail();

  return (
    <div>
      <PageHero
        icon={HelpCircle}
        badge={t("help.badge")}
        title={t("help.title")}
        subtitle={t("help.subtitle")}
      />

      <Section>
        <Container>
          <ul className="grid gap-5 sm:grid-cols-2">
            {CARDS.map(({ icon: Icon, title, body, href }, i) => (
              <li key={title}>
                <Reveal delay={i * 0.05}>
                <Card className="h-full p-6">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-fg">{t(title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">{t(body)}</p>
                  <Link
                    href={href}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
                  >
                    {t("help.learnMore")} <span aria-hidden="true">→</span>
                  </Link>
                </Card>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section className="border-t border-line bg-surface-sunken">
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionHeading
              eyebrow={t("help.faqEyebrow")}
              title={t("help.faqTitle")}
              description={t("help.faqSubtitle")}
              align="center"
              className="mb-6"
            />
          </Reveal>
          <Reveal delay={0.05} className="mx-auto max-w-2xl space-y-3">
            {(["help.q1", "help.q2", "help.q3", "help.q4"] as const).map((q) => (
              <details
                key={q}
                className="group rounded-2xl border border-line bg-surface p-5 open:shadow-sm"
              >
                <summary className="cursor-pointer text-[0.9375rem] font-semibold text-fg marker:hidden">
                  {t(`${q}.q` as MessageKey)}
                  <span
                    className="float-right text-fg-muted transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">{t(`${q}.a` as MessageKey)}</p>
              </details>
            ))}
          </Reveal>
        </Container>
      </Section>

      <Section className="border-t border-line">
        <Container>
          <Reveal className="mx-auto max-w-3xl rounded-3xl bg-surface-sunken p-8 text-center">
            <h2 className="font-display text-xl font-semibold text-fg">{t("help.contactTitle")}</h2>
            <p className="mt-2 text-sm text-fg-muted">{t("help.contactBody")}</p>
            {supportEmail ? (
              <a
                href={`mailto:${supportEmail}`}
                className={buttonClasses({ variant: "primary", size: "lg", className: "mt-6 inline-flex" })}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {supportEmail}
              </a>
            ) : (
              <Link
                href="/contact"
                className={buttonClasses({ variant: "primary", size: "lg", className: "mt-6 inline-flex" })}
              >
                {t("help.contactPage")}
              </Link>
            )}
          </Reveal>
        </Container>
      </Section>

      <CtaBand />
    </div>
  );
}

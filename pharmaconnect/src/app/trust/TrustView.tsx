"use client";

import {
  BadgeCheck,
  LockKeyhole,
  MessageCircleWarning,
  Database,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PageHero } from "@/components/PageHero";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { CtaBand } from "@/components/CtaBand";
import { useLocale } from "@/components/LocaleProvider";
import Link from "next/link";
import type { MessageKey } from "@/lib/i18n";

interface Pillar {
  icon: LucideIcon;
  title: MessageKey;
  body: MessageKey;
}

const PILLARS: Pillar[] = [
  { icon: BadgeCheck, title: "trustPage.verifyTitle", body: "trustPage.verifyBody" },
  { icon: LockKeyhole, title: "trustPage.noSellTitle", body: "trustPage.noSellBody" },
  { icon: Database, title: "trustPage.pharmacyOwnsDataTitle", body: "trustPage.pharmacyOwnsDataBody" },
  { icon: ShieldCheck, title: "trustPage.privacyTitle", body: "trustPage.privacyBody" },
  { icon: MessageCircleWarning, title: "trustPage.reportTitle", body: "trustPage.reportBody" },
];

export default function TrustView() {
  const { t } = useLocale();

  return (
    <div>
      <PageHero
        icon={ShieldCheck}
        badge={t("trustPage.badge")}
        title={t("trustPage.title")}
        subtitle={t("trustPage.subtitle")}
      />

      <Section>
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t("trustPage.eyebrow")}
              title={t("trustPage.pillarsTitle")}
              description={t("trustPage.pillarsSubtitle")}
              align="center"
              className="mb-10"
            />
          </Reveal>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, body }, i) => (
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
                </Card>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section className="border-t border-line bg-surface-sunken">
        <Container>
          <Reveal className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
              <h2 className="font-display text-xl font-semibold text-fg">{t("trustPage.limitsTitle")}</h2>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">{t("trustPage.limitsBody")}</p>
            </div>
            <p className="mt-6 text-sm text-fg-muted">
              {t("trustPage.linksIntro")}{" "}
              <Link href="/privacy" className="font-semibold text-accent hover:underline">
                {t("footer.privacy")}
              </Link>{" "}
              Â·{" "}
              <Link href="/terms" className="font-semibold text-accent hover:underline">
                {t("footer.terms")}
              </Link>{" "}
              Â·{" "}
              <Link href="/safety" className="font-semibold text-accent hover:underline">
                {t("nav.safety")}
              </Link>
            </p>
          </Reveal>
        </Container>
      </Section>

      <CtaBand
        title={t("trustPage.ctaTitle")}
        body={t("trustPage.ctaBody")}
        primary={{ href: "/", label: t("details.findNow") }}
        secondary={{ href: "/contact", label: t("nav.contact") }}
      />
    </div>
  );
}

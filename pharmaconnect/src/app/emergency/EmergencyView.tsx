"use client";

import { Siren, Phone, ShieldAlert, Ambulance, Info } from "lucide-react";

const EMERGENCY_NUMBERS: [MessageKey, MessageKey][] = [
  ["emergency.numAmbulance", "emergency.telAmbulance"],
  ["emergency.numPolice", "emergency.telPolice"],
  ["emergency.numFire", "emergency.telFire"],
  ["emergency.numMental", "emergency.telMental"],
];
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PageHero } from "@/components/PageHero";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { CtaBand } from "@/components/CtaBand";
import { useLocale } from "@/components/LocaleProvider";
import { buttonClasses } from "@/components/ui/Button";
import Link from "next/link";
import type { MessageKey } from "@/lib/i18n";

export default function EmergencyView() {
  const { t } = useLocale();

  return (
    <div>
      <PageHero
        icon={Siren}
        badge={t("emergency.badge")}
        title={t("emergency.title")}
        subtitle={t("emergency.subtitle")}
      />

      <Section>
        <Container>
          <Reveal>
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/30 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700 dark:text-red-400">
                {t("emergency.callNowLabel")}
              </p>
              <p className="mt-3 font-display text-[clamp(3rem,9vw,5.5rem)] font-bold leading-none text-red-700 dark:text-red-400">
                {t("emergency.ambulanceNumber")}
              </p>
              <p className="mt-3 text-sm sm:text-base text-red-800 dark:text-red-300">
                {t("emergency.ambulanceHint")}
              </p>
              <a
                href={`tel:${t("emergency.ambulanceTel")}`}
                className={buttonClasses({
                  size: "lg",
                  className: "mt-6 bg-red-700 text-white hover:bg-red-800",
                })}
              >
                <Phone className="h-5 w-5" aria-hidden="true" />
                {t("emergency.callAmbulance")}
              </a>
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section className="border-t border-line">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t("emergency.numbersEyebrow")}
              title={t("emergency.numbersTitle")}
              align="left"
              className="mb-6"
            />
          </Reveal>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EMERGENCY_NUMBERS.map(([labelKey, telKey]) => (
              <li key={labelKey}>
                <Reveal delay={0.05}>
                <Card className="h-full p-5">
                  <ShieldAlert className="h-5 w-5 text-accent" aria-hidden="true" />
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
                    {t(labelKey)}
                  </p>
                  <a
                    href={`tel:${t(telKey)}`}
                    className="mt-1 block font-display text-2xl font-bold text-fg"
                  >
                    {t(telKey)}
                  </a>
                </Card>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section className="border-t border-line bg-surface-sunken">
        <Container>
          <Reveal className="mx-auto max-w-3xl space-y-4 text-sm leading-relaxed text-fg-muted">
            <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-5">
              <Ambulance className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <p className="font-semibold text-fg">{t("emergency.doNowTitle")}</p>
                <p className="mt-1">{t("emergency.doNowBody")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-5">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-fg-muted" aria-hidden="true" />
              <div>
                <p className="font-semibold text-fg">{t("emergency.limitsTitle")}</p>
                <p className="mt-1">{t("emergency.limitsBody")}</p>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>

      <CtaBand
        title={t("emergency.ctaTitle")}
        body={t("emergency.ctaBody")}
        primary={{ href: "/", label: t("emergency.findNearestOpen") }}
        secondary={{ href: "/help", label: t("help.titleShort") }}
      />
    </div>
  );
}

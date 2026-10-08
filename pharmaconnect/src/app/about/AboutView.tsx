"use client";

import { useEffect, useState } from "react";
import {
  Heart,
  Users,
  ShieldCheck,
  BadgeCheck,
  MapPinned,
  Clock,
  Wallet,
  Store,
  type LucideIcon,
} from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";
import { useLocale } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

interface PublicStats {
  verifiedPharmacies: number;
  medicineCount: number;
}

const PROBLEMS: { icon: LucideIcon; title: MessageKey; body: MessageKey }[] = [
  { icon: MapPinned, title: "about.problem1Title", body: "about.problem1Body" },
  { icon: Clock, title: "about.problem2Title", body: "about.problem2Body" },
  { icon: BadgeCheck, title: "about.problem3Title", body: "about.problem3Body" },
];

// Three of the four reuse the shared trust copy; only the fourth is About-specific.
const VALUES: { icon: LucideIcon; title: MessageKey; body: MessageKey }[] = [
  { icon: ShieldCheck, title: "trust.verifiedTitle", body: "trust.verifiedBody" },
  { icon: Users, title: "trust.reportTitle", body: "trust.reportBody" },
  { icon: Wallet, title: "trust.freeTitle", body: "trust.freeBody" },
  { icon: Store, title: "about.value4Title", body: "about.value4Body" },
];

function StatsBand() {
  const { t } = useLocale();
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/stats/public", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: PublicStats | null) => {
        if (d && typeof d.verifiedPharmacies === "number") setStats(d);
      })
      .catch(() => {
        // Decoration — a failure must not break the page.
      });
    return () => controller.abort();
  }, []);

  const items: { key: string; value: string; label: MessageKey }[] = [
    {
      key: "pharmacies",
      value: stats ? stats.verifiedPharmacies.toLocaleString() : "—",
      label: "home.stats.verifiedPharmacies",
    },
    {
      key: "medicines",
      value: stats ? `${Math.round(stats.medicineCount / 100) / 10}k` : "—",
      label: "home.stats.medicineTypes",
    },
  ];

  return (
    <Section className="border-y border-line bg-surface-sunken">
      <Container>
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="headline font-display text-2xl text-fg sm:text-3xl">
              {t("about.statsTitle")}
            </h2>
            <p className="lede mt-2 text-sm text-fg-muted sm:text-base">{t("about.statsSubtitle")}</p>
          </div>
          <dl className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <div
                key={item.key}
                className="rounded-2xl border border-line bg-surface px-6 py-8 text-center shadow-card"
              >
                <dd className="tabular font-display text-4xl font-semibold text-fg">{item.value}</dd>
                <dt className="mt-2 text-sm text-fg-muted">{t(item.label)}</dt>
              </div>
            ))}
          </dl>
        </Reveal>
      </Container>
    </Section>
  );
}

export default function AboutView() {
  const { t } = useLocale();

  return (
    <div>
      <PageHero icon={Heart} badge={t("about.badge")} title={t("about.title")} subtitle={t("about.subtitle")} />

      {/* Mission */}
      <Section>
        <Container>
          <Reveal>
            <SectionHeading
              className="mx-auto max-w-3xl"
              eyebrow={t("about.missionEyebrow")}
              title={t("about.missionTitle")}
              description={t("about.missionBody")}
              align="center"
            />
          </Reveal>
        </Container>
      </Section>

      {/* The problem */}
      <Section className="border-y border-line bg-surface-sunken">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t("about.problemEyebrow")}
              title={t("about.problemTitle")}
            />
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {PROBLEMS.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 0.07} className="h-full">
                <Card className="h-full p-5">
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

      {/* Values */}
      <Section>
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t("about.valuesEyebrow")}
              title={t("about.valuesTitle")}
              description={t("about.valuesSubtitle")}
            />
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {VALUES.map(({ icon: Icon, title, body }, i) => (
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

      <StatsBand />

      <CtaBand
        title={t("about.ctaTitle")}
        body={t("about.ctaBody")}
        primary={{ href: "/", label: t("details.findNow") }}
        secondary={{ href: "/contact", label: t("nav.contact") }}
      />
    </div>
  );
}

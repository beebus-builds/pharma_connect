"use client";

import { BarChart3, Building2, Pill, Users, BellRing, ShieldCheck, type LucideIcon } from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PageHero } from "@/components/PageHero";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { useLocale } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";
import Link from "next/link";

interface InsightsStats {
  pharmacyCount: number;
  verifiedPharmacyCount: number;
  medicineCount: number;
  userCount: number;
  patientCount: number;
  pharmacyAccountCount: number;
  requestCount: number;
  openReportsCount: number;
  stockCount: number;
}

interface Coverage { name: string; count: number }
interface TopReq { genericName: string; count: number }

export default function InsightsView({
  stats,
  coverage,
  topRequested,
}: { stats: InsightsStats; coverage: Coverage[]; topRequested: TopReq[] }) {
  const { t } = useLocale();

  const fmt = (n: number) => n.toLocaleString();

  const cards: { icon: LucideIcon; label: MessageKey; value: number }[] = [
    { icon: Building2, label: "insights.verifiedPharmacies", value: stats.verifiedPharmacyCount },
    { icon: Building2, label: "insights.totalPharmacies", value: stats.pharmacyCount },
    { icon: Pill, label: "insights.catalogMedicines", value: stats.medicineCount },
    { icon: Pill, label: "insights.stockBatches", value: stats.stockCount },
    { icon: Users, label: "insights.registeredUsers", value: stats.userCount },
    { icon: Users, label: "insights.patients", value: stats.patientCount },
    { icon: BarChart3, label: "insights.requests", value: stats.requestCount },
    { icon: BellRing, label: "insights.openReports", value: stats.openReportsCount },
  ];

  return (
    <div>
      <PageHero
        icon={BarChart3}
        badge={t("insights.badge")}
        title={t("insights.title")}
        subtitle={t("insights.subtitle")}
      />

      <Section>
        <Container>
          <Reveal className="mb-6">
            <SectionHeading
              eyebrow={t("insights.statsEyebrow")}
              title={t("insights.statsTitle")}
              description={t("insights.statsSubtitle")}
              align="center"
            />
          </Reveal>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ icon: Icon, label, value }, i) => (
              <Reveal key={label} delay={i * 0.04}>
                <Card className="h-full p-5">
                  <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-fg-muted">
                    {t(label)}
                  </p>
                  <p className="mt-1 font-display text-3xl font-bold tabular text-fg">{fmt(value)}</p>
                </Card>
              </Reveal>
            ))}
          </ul>
          <p className="mt-4 text-center text-xs text-fg-subtle">{t("insights.statsNote")}</p>
        </Container>
      </Section>

      <Section className="border-t border-line bg-surface-sunken">
        <Container>
          <Reveal className="mb-6">
            <SectionHeading
              eyebrow={t("insights.coverageEyebrow")}
              title={t("insights.coverageTitle")}
              description={t("insights.coverageSubtitle")}
            />
          </Reveal>
          {coverage.length === 0 ? (
            <Reveal>
              <Card className="p-6 text-sm text-fg-muted">{t("insights.coverageEmpty")}</Card>
            </Reveal>
          ) : (
            <Card className="overflow-hidden p-0">
              <ul className="divide-y divide-line">
                {coverage.map((c, i) => (
                  <Reveal key={c.name} delay={i * 0.02}>
                    <div className="flex items-center justify-between gap-4 px-6 py-4">
                      <Link
                        href={`/pharmacies/in/${c.name.toLowerCase().replace(/\s+/g, "-")}`}
                        className="text-sm font-medium text-fg hover:text-accent"
                      >
                        {c.name}
                      </Link>
                      <span className="tabular text-sm font-semibold text-fg-muted">{c.count}</span>
                    </div>
                  </Reveal>
                ))}
              </ul>
            </Card>
          )}
        </Container>
      </Section>

      <Section className="border-t border-line">
        <Container>
          <Reveal className="mb-6">
            <SectionHeading
              eyebrow={t("insights.demandEyebrow")}
              title={t("insights.demandTitle")}
              description={t("insights.demandSubtitle")}
            />
          </Reveal>
          {topRequested.length === 0 ? (
            <Reveal>
              <Card className="p-6 text-sm text-fg-muted">{t("insights.demandEmpty")}</Card>
            </Reveal>
          ) : (
            <Card className="overflow-hidden p-0">
              <ol className="divide-y divide-line">
                {topRequested.map((r, i) => (
                  <Reveal key={r.genericName} delay={i * 0.02}>
                    <div className="flex items-center justify-between gap-4 px-6 py-4">
                      <span className="flex items-center gap-3 text-sm font-medium text-fg">
                        <span className="tabular text-fg-muted">{i + 1}.</span>
                        {r.genericName}
                      </span>
                      <span className="tabular text-sm font-semibold text-fg-muted">{r.count}</span>
                    </div>
                  </Reveal>
                ))}
              </ol>
            </Card>
          )}
          <p className="mt-4 text-xs text-fg-subtle">{t("insights.demandNote")}</p>
        </Container>
      </Section>

      <Section className="border-t border-line bg-surface-sunken">
        <Container>
          <Reveal className="mx-auto max-w-3xl text-center">
            <ShieldCheck className="mx-auto h-6 w-6 text-accent" aria-hidden="true" />
            <p className="mt-3 text-sm text-fg-muted">{t("insights.privacyNote")}</p>
          </Reveal>
        </Container>
      </Section>
    </div>
  );
}

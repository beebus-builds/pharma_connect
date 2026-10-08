"use client";

import Link from "next/link";
import { Crown, ShieldCheck } from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Alert, Accordion } from "@/components/ui/Feedback";
import { Reveal } from "@/components/ui/Reveal";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";
import { PlanGrid } from "@/components/PlanGrid";
import { useLocale } from "@/components/LocaleProvider";

export default function PricingView() {
  const { t } = useLocale();

  const faq = [
    { id: "q1", question: t("pricing.faq1.q"), answer: t("pricing.faq1.a") },
    { id: "q2", question: t("pricing.faq2.q"), answer: t("pricing.faq2.a") },
    { id: "q3", question: t("pricing.faq3.q"), answer: t("pricing.faq3.a") },
  ];

  return (
    <div>
      <PageHero icon={Crown} badge={t("plans.eyebrow")} title={t("plans.title")} subtitle={t("plans.subtitle")} />

      {/* Plans */}
      <Section>
        <Container>
          <Reveal className="mt-2">
            <PlanGrid />
          </Reveal>
          <Reveal className="mx-auto mt-6 max-w-2xl">
            <Alert tone="info" icon={<ShieldCheck className="h-4 w-4" />}>
              <span className="font-semibold">{t("plans.secureTitle")}.</span> {t("plans.secureBody")}
            </Alert>
            <p className="mt-4 text-center text-sm text-fg-muted">{t("plans.freeListingBody")}</p>
            <p className="mt-2 text-center text-xs text-fg-subtle">{t("plans.footnote")}</p>
          </Reveal>
        </Container>
      </Section>

      {/* Billing FAQ */}
      <Section className="border-y border-line bg-surface-sunken">
        <Container className="max-w-3xl">
          <Reveal>
            <SectionHeading title={t("pricing.faqTitle")} align="center" className="mb-8" />
          </Reveal>
          <Reveal>
            <Accordion items={faq} />
          </Reveal>
          <Reveal className="mt-6 text-center">
            <Link href="/contact" className="text-sm font-semibold text-accent hover:underline">
              {t("plans.contactSupport")} →
            </Link>
          </Reveal>
        </Container>
      </Section>

      <CtaBand
        title={t("pricing.ctaTitle")}
        body={t("pricing.ctaBody")}
        primary={{ href: "/register", label: t("details.pharmacyCta"), variant: "primary" }}
        secondary={{ href: "/contact", label: t("nav.contact") }}
      />
    </div>
  );
}

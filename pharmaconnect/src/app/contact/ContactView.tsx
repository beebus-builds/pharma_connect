"use client";

import Link from "next/link";
import { Mail, Flag, Store, PhoneCall, ArrowUpRight, type LucideIcon } from "lucide-react";
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

const SUPPORT_EMAIL = "support@pharmaconnect.com.np";

interface Channel {
  icon: LucideIcon;
  title: MessageKey;
  body: MessageKey;
  action: React.ReactNode;
}

export default function ContactView() {
  const { t } = useLocale();

  const channels: Channel[] = [
    {
      icon: Mail,
      title: "contact.emailTitle",
      body: "contact.emailBody",
      action: (
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("PharmaConnect support")}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
        >
          {SUPPORT_EMAIL}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      ),
    },
    {
      icon: Flag,
      title: "contact.reportTitle",
      body: "contact.reportBody",
      action: (
        <Link
          href="/#pharmacies"
          className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
        >
          {t("details.guide")}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ),
    },
    {
      icon: Store,
      title: "contact.partnershipTitle",
      body: "contact.partnershipBody",
      action: (
        <div className="flex flex-wrap gap-4">
          <Link href="/for-pharmacies" className="text-sm font-semibold text-accent hover:underline">
            {t("nav.forPharmacies")}
          </Link>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("List my pharmacy")}`}
            className="text-sm font-semibold text-accent hover:underline"
          >
            {t("contact.emailTitle")}
          </a>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHero
        icon={Mail}
        badge={t("contact.badge")}
        title={t("contact.title")}
        subtitle={t("contact.subtitle")}
      />

      {/* Channels */}
      <Section>
        <Container>
          <Reveal>
            <SectionHeading title={t("contact.channelsTitle")} />
          </Reveal>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {channels.map(({ icon: Icon, title, body, action }, i) => (
              <Reveal key={title} delay={i * 0.07} className="h-full">
                <Card className="flex h-full flex-col p-5 sm:p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold text-fg">{t(title)}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-fg-muted">{t(body)}</p>
                  <div className="mt-4">{action}</div>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* Emergency + FAQ */}
      <Section className="border-t border-line bg-surface-sunken">
        <Container className="max-w-3xl">
          <Reveal className="space-y-6">
            <Alert tone="danger" title={t("contact.noteTitle")} icon={<PhoneCall className="h-4 w-4" />}>
              {t("contact.noteBody")}
            </Alert>

            <Card variant="muted" className="p-5 sm:p-6">
              <h3 className="font-display text-base font-semibold text-fg">
                {t("details.faqSubtitle")}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                {t("details.guide")} · {t("home.step.searchDesc")}
              </p>
              <Link
                href="/how-it-works"
                className={`${buttonClasses({ variant: "secondary", size: "sm", className: "mt-4" })}`}
              >
                {t("nav.howItWorks")}
              </Link>
            </Card>
          </Reveal>
        </Container>
      </Section>

      <CtaBand
        title={t("about.ctaTitle")}
        body={t("about.ctaBody")}
        primary={{ href: "/", label: t("details.findNow") }}
        secondary={{ href: "/for-pharmacies", label: t("nav.forPharmacies") }}
      />
    </div>
  );
}

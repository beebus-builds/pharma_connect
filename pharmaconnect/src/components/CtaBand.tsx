"use client";

import Link from "next/link";
import { Container, Section } from "@/components/ui/Container";
import { buttonClasses } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { useLocale } from "@/components/LocaleProvider";

interface CtaLink {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
}

/**
 * Full-width closing call-to-action band.
 *
 * Extracted from the inline band at the foot of the homepage details so the new
 * public pages close with the same inverse-surface treatment instead of each
 * one re-typing the mesh, the clamp and the button pairing.
 */
export function CtaBand({
  title,
  body,
  primary,
  secondary,
}: {
  title?: string;
  body?: string;
  primary?: CtaLink;
  secondary?: CtaLink;
}) {
  const { t } = useLocale();

  const primaryLink: CtaLink = primary ?? { href: "/", label: t("details.findNow") };
  const secondaryLink: CtaLink = secondary ?? { href: "/register", label: t("details.joinPharmacy") };

  return (
    <Section className="border-t border-line">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-surface-inverse px-6 py-14 text-center text-fg-inverse sm:px-12 sm:py-20">
            <div className="mesh pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
            <div className="relative">
              <h2 className="headline text-display font-display">
                {title ?? `${t("details.ctaLine1")} ${t("details.ctaLine2")}`}
              </h2>
              <p className="lede mx-auto mt-4 max-w-xl text-sm opacity-80 sm:text-base">
                {body ?? t("details.ctaBody")}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={primaryLink.href}
                  className={buttonClasses({
                    size: "lg",
                    variant: "secondary",
                  })}
                >
                  {primaryLink.label}
                </Link>
                <Link
                  href={secondaryLink.href}
                  className={buttonClasses({
                    size: "lg",
                    className:
                      "bg-white/10 text-white ring-1 ring-inset ring-white/25 hover:bg-white/20",
                  })}
                >
                  {secondaryLink.label}
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}

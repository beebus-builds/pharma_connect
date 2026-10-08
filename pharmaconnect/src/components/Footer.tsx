"use client";

import Link from "next/link";
import { useState } from "react";
import { Globe, MessageCircle, PhoneCall, Mail, Send, Stethoscope, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Container } from "@/components/ui/Container";
import { useLocale } from "@/components/LocaleProvider";
import { appToast as toast } from "@/components/Providers";

const LINK_GROUPS = [
  {
    headingKey: "footer.quickLinks" as const,
    links: [
      { href: "/", labelKey: "footer.searchMedicines" as const },
      { href: "/medicines", labelKey: "footer.browseCatalog" as const },
      { href: "/how-it-works", labelKey: "nav.howItWorks" as const },
      { href: "/about", labelKey: "nav.about" as const },
      { href: "/contact", labelKey: "nav.contact" as const },
      { href: "/offline", labelKey: "footer.offlineAccess" as const },
    ],
  },
  {
    headingKey: "footer.account" as const,
    links: [
      { href: "/login", labelKey: "footer.userLogin" as const },
      { href: "/register", labelKey: "footer.patientSignup" as const },
      { href: "/register", labelKey: "footer.joinPharmacy" as const },
      { href: "/for-pharmacies", labelKey: "nav.forPharmacies" as const },
      { href: "/pricing", labelKey: "nav.pricing" as const },
    ],
  },
];

export default function Footer() {
  const { t, locale } = useLocale();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const value = String(formData.get("email") ?? "").trim();
    if (!value || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: value,
          website: String(formData.get("website") ?? ""),
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("footer.subscribeFailed"));
      toast.success(t("footer.subscribed"));
      setEmail("");
      form.reset();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("footer.subscribeFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="mt-auto border-t border-line bg-surface-sunken transition-colors duration-300">
      <Container className="pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-14">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          {/* Brand + newsletter */}
          <div className="md:col-span-5 lg:col-span-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-fg">
                <Stethoscope className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <span className="font-display text-xl font-semibold text-fg">PharmaConnect</span>
            </Link>
            <p className="lede mt-4 max-w-sm text-sm text-fg-muted">{t("footer.tagline")}</p>

            <form onSubmit={handleSubscribe} className="mt-7 max-w-sm space-y-2.5">
              <label
                htmlFor="newsletter-email"
                className="block text-[11px] font-bold uppercase tracking-[0.12em] text-fg-subtle"
              >
                {t("footer.stayUpdated")}
              </label>
              <div className="flex gap-2">
                <Input
                  id="newsletter-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("footer.emailPlaceholder")}
                  aria-label={t("footer.emailPlaceholder")}
                  className="flex-1"
                  required
                />
                <Button type="submit" size="icon" aria-label={t("footer.subscribe")} loading={submitting}>
                  <Send className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              {/* Honeypot: visually hidden, removed from the a11y tree and tab order. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="pointer-events-none absolute h-0 w-0 opacity-0"
                defaultValue=""
              />
            </form>
          </div>

          {/* Link columns */}
          {LINK_GROUPS.map((group) => (
            <nav key={group.headingKey} aria-label={t(group.headingKey)} className="md:col-span-3 lg:col-span-2">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-fg-subtle">
                {t(group.headingKey)}
              </h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={`${group.headingKey}-${link.href}-${link.labelKey}`}>
                    <Link
                      href={link.href}
                      className="inline-flex items-center gap-1 rounded text-sm text-fg-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                    >
                      {t(link.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Contact */}
          <div className="md:col-span-12 lg:col-span-2">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-fg-subtle">
              {t("footer.contact")}
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a
                  href="mailto:support@pharmaconnect.com.np"
                  className="inline-flex items-center gap-2 rounded text-fg-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                >
                  <Mail className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
                  support@pharmaconnect.com.np
                </a>
              </li>
              <li>
                <a
                  href="/chat"
                  className="inline-flex items-center gap-2 rounded text-fg-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                >
                  <MessageCircle className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
                  {t("nav.messages")}
                </a>
              </li>
              <li>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=PharmaConnect+Nepal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded text-fg-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                >
                  <Globe className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
                  Nepal
                  <ArrowUpRight className="h-3 w-3 opacity-50" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 border-t border-line pt-8 text-xs text-fg-subtle md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} PharmaConnect Nepal</p>
          <nav aria-label={t("footer.legal")} className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link
              href="/privacy"
              className="rounded transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            >
              {t("footer.privacy")}
            </Link>
            <Link
              href="/terms"
              className="rounded transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            >
              {t("footer.terms")}
            </Link>
            <Link
              href="/safety"
              className="rounded transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            >
              {t("nav.safety")}
            </Link>
            <a
              href="mailto:support@pharmaconnect.com.np"
              className="inline-flex items-center gap-1.5 rounded transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            >
              <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
              {t("footer.support")}
            </a>
          </nav>
        </div>
      </Container>
    </footer>
  );
}

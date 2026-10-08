"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Crown, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/LocaleProvider";
import type { Plan } from "@/lib/plans";

export type PlanDefinitionDTO = {
  plan: Plan;
  priceRupees: number;
  label: string;
  benefits: string[];
  rank: number;
  paid: boolean;
};

const ICONS = { FREE: Sparkles, VERIFIED: Check, FEATURED: Crown } as const;

/**
 * Read-only pricing grid.
 *
 * The upgrade flow in `PlanCard` is deliberately separate: it posts to Khalti and
 * needs a session. This one is for the public marketing band, so it only links
 * to sign-up. Prices come from `/api/plans` rather than being typed in twice.
 */
export function PlanGrid() {
  const { t, locale } = useLocale();
  const [plans, setPlans] = useState<PlanDefinitionDTO[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/plans", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setPlans(data?.plans ?? []))
      .catch(() => {
        // Pricing is informational; a failure must not break the page.
      });
    return () => controller.abort();
  }, []);

  if (!plans) return <CardSkeleton count={3} />;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {plans.map((plan) => {
        const Icon = ICONS[plan.plan];
        const highlighted = plan.plan === "VERIFIED";
        return (
          <Card
            key={plan.plan}
            className={cn(
              "relative flex flex-col p-6",
              highlighted && "border-accent ring-1 ring-accent/25"
            )}
          >
            {highlighted && (
              <span className="absolute -top-2.5 left-6 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-accent-fg">
                {t("plans.mostPopular")}
              </span>
            )}
            <div className="flex items-center gap-2">
              <Icon
                className={cn("h-4 w-4", plan.plan === "FEATURED" ? "text-amber-500" : "text-accent")}
                aria-hidden="true"
              />
              <p className="font-display text-base font-semibold text-fg">{plan.label}</p>
            </div>
            <p className="tabular mt-3 font-display text-3xl font-semibold text-fg">
              {plan.priceRupees === 0
                ? t("plans.free")
                : `Rs. ${plan.priceRupees.toLocaleString(locale === "ne" ? "ne-NP" : "en-NP")}`}
              {plan.paid && (
                <span className="ml-1 text-xs font-medium text-fg-subtle">
                  / {t("plans.perMonth")}
                </span>
              )}
            </p>
            <ul className="mt-5 flex-1 space-y-2">
              {plan.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2 text-sm text-fg-muted">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className={buttonClasses({
                block: true,
                variant: highlighted ? "primary" : "secondary",
                className: "mt-6",
              })}
            >
              {t("plans.startFree")}
            </Link>
          </Card>
        );
      })}
    </div>
  );
}

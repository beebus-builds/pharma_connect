"use client";

import { useCallback, useState } from "react";
import { Check, Crown, Sparkles, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Feedback";
import { appToast as toast } from "@/components/Providers";
import { useLocale } from "@/components/LocaleProvider";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/plans";

export type PlanDefinitionDTO = {
  plan: Plan;
  priceRupees: number;
  label: string;
  benefits: string[];
  rank: number;
  paid: boolean;
};

type Props = {
  currentPlan: Plan;
  daysRemaining: number | null;
  catalog: PlanDefinitionDTO[];
};

const ICONS = { FREE: Sparkles, VERIFIED: Check, FEATURED: Crown } as const;

/** Current plan + upgrade path for a signed-in pharmacy owner. */
export default function PlanCard({ currentPlan, daysRemaining, catalog }: Props) {
  const { t, locale } = useLocale();
  const [busy, setBusy] = useState<Plan | null>(null);

  const subscribe = useCallback(
    async (plan: Plan) => {
      if (plan === currentPlan) return;
      setBusy(plan);
      try {
        // Only the plan *name* is sent. The amount is resolved server-side from
        // the catalog, so a tampered price cannot be charged.
        const res = await fetch("/api/payments/khalti/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("common.error"));
        window.location.href = data.paymentUrl;
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : t("common.error"));
        setBusy(null);
      }
    },
    [currentPlan, t]
  );

  const ordered = [...catalog].sort((a, b) => a.rank - b.rank);
  const current = ordered.find((p) => p.plan === currentPlan);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
        <h2 className="font-display text-lg font-semibold text-fg">{t("plans.yourPlan")}</h2>
        {daysRemaining !== null && (
          <Badge tone={daysRemaining <= 5 ? "warning" : "neutral"}>
            {daysRemaining === 0
              ? t("plans.expiresToday")
              : t("plans.daysLeft", { count: daysRemaining })}
          </Badge>
        )}
      </div>

      <p className="px-5 pt-4 text-sm text-fg-muted">
        {currentPlan === "FREE"
          ? t("plans.freeListingBody")
          : t("plans.onPlan", { label: current?.label ?? currentPlan })}
      </p>

      <div className="grid gap-3 p-5 pt-4 sm:grid-cols-3">
        {ordered.map((plan) => {
          const Icon = ICONS[plan.plan];
          const isCurrent = plan.plan === currentPlan;
          const isDowngrade = plan.rank < (current?.rank ?? 0);
          return (
            <div
              key={plan.plan}
              className={cn(
                "flex flex-col rounded-2xl border p-4 transition-colors",
                isCurrent
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-surface hover:border-line-strong"
              )}
            >
              <div className="mb-1 flex items-center gap-2">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    plan.plan === "FEATURED" ? "text-amber-500" : "text-accent"
                  )}
                  aria-hidden="true"
                />
                <p className="truncate text-sm font-semibold text-fg">{plan.label}</p>
              </div>
              <p className="tabular mb-3 font-display text-2xl font-semibold text-fg">
                {plan.priceRupees === 0
                  ? t("plans.free")
                  : `Rs. ${plan.priceRupees.toLocaleString(locale === "ne" ? "ne-NP" : "en-NP")}`}
                {plan.paid && (
                  <span className="text-xs font-medium text-fg-subtle"> / {t("plans.perMonth")}</span>
                )}
              </p>
              <ul className="mb-4 flex-1 space-y-1.5">
                {plan.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-1.5 text-xs text-fg-muted">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <Button variant="secondary" disabled block>
                  {t("plans.currentPlan")}
                </Button>
              ) : isDowngrade ? (
                <p className="flex items-start gap-1.5 text-xs text-fg-subtle">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {t("plans.contactSupport")}
                </p>
              ) : (
                <Button
                  block
                  onClick={() => void subscribe(plan.plan)}
                  loading={busy === plan.plan}
                  disabled={busy !== null}
                >
                  {currentPlan === "FREE" ? t("plans.upgrade") : t("plans.switch")}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <Alert tone="info" className="mx-5 mb-5" title={t("plans.secureTitle")}>
        {t("plans.secureBody")}
      </Alert>
    </Card>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Crown, Sparkles, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { appToast as toast } from "@/components/Providers";
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

export default function PlanCard({ currentPlan, daysRemaining, catalog }: Props) {
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
        if (!res.ok) throw new Error(data.error || "Failed to start payment");
        window.location.href = data.paymentUrl;
      } catch (e: any) {
        toast.error(e.message || "Something went wrong");
        setBusy(null);
      }
    },
    [currentPlan]
  );

  const ordered = [...catalog].sort((a, b) => a.rank - b.rank);

  return (
    <Card className="mb-8 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 className="font-bold text-lg">Your plan</h2>
        {daysRemaining !== null && (
          <span
            className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-full",
              daysRemaining <= 5
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            {daysRemaining === 0 ? "Expires today" : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-5">
        {currentPlan === "FREE"
          ? "Free listing: patients can find you and send requests. Paid plans add a Verified badge, priority in the verification queue, and top placement."
          : `You are on ${ordered.find((p) => p.plan === currentPlan)?.label ?? currentPlan}.`}
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {ordered.map((plan) => {
          const Icon = ICONS[plan.plan];
          const isCurrent = plan.plan === currentPlan;
          const isDowngrade = plan.rank < ordered.find((p) => p.plan === currentPlan)!.rank;
          return (
            <div
              key={plan.plan}
              className={cn(
                "rounded-2xl border p-4 flex flex-col",
                isCurrent ? "border-primary-500 ring-2 ring-primary-500/20 bg-primary-50/40 dark:bg-primary-950/20" : "border-slate-200 dark:border-slate-700"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("h-4 w-4", plan.plan === "FEATURED" ? "text-amber-500" : "text-primary-600")} aria-hidden="true" />
                <p className="font-bold">{plan.label}</p>
              </div>
              <p className="text-2xl font-black mb-3">
                {plan.priceRupees === 0 ? "Free" : `Rs. ${plan.priceRupees.toLocaleString("en-NP")}`}
                {plan.paid && <span className="text-xs font-medium text-slate-400"> / 30 days</span>}
              </p>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 flex-1 mb-4">
                {plan.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-1.5">
                    <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary-600" aria-hidden="true" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <Button variant="secondary" disabled>
                  Current plan
                </Button>
              ) : isDowngrade ? (
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  Contact support to downgrade
                </p>
              ) : (
                <Button onClick={() => subscribe(plan.plan)} loading={busy === plan.plan} disabled={busy !== null}>
                  {currentPlan === "FREE" ? "Upgrade" : "Switch"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

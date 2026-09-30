/**
 * Subscription tiers (SPECS 4D).
 *
 * Prices are env-driven so operations can change them without a deploy, and are
 * read at call time rather than module scope so tests can vary them.
 *
 * An expired plan is *derived*, never stored as a separate flag. The old
 * `subscriptionActive` boolean could sit `true` forever after the expiry date
 * passed; comparing `planExpiresAt` to now cannot drift.
 */

export const PLANS = ["FREE", "VERIFIED", "FEATURED"] as const;
export type Plan = (typeof PLANS)[number];

export const PLAN_PERIOD_DAYS = 30;

export type PlanDefinition = {
  plan: Plan;
  /** Rupees per period. */
  priceRupees: number;
  /** Paisa, which is what Khalti wants. */
  pricePaisa: number;
  label: string;
  /** What the plan actually does, in words we are willing to print. */
  benefits: string[];
  /** Higher wins. Drives paid placement in nearby search. */
  rank: number;
  /** Paid plans only. */
  paid: boolean;
};

const FALLBACK: Record<Plan, number> = {
  FREE: 0,
  VERIFIED: 999,
  FEATURED: 2499,
};

function priceRupeesFor(plan: Plan): number {
  const envKey = `PLAN_PRICE_NPR_${plan}` as const;
  const raw = process.env[envKey];
  if (raw === undefined) return FALLBACK[plan];
  const parsed = Number(raw);
  // A malformed or negative price must never silently become a free/negative charge.
  if (!Number.isFinite(parsed) || parsed < 0) {
    console.warn(`[plans] ${envKey}="${raw}" is not a valid price, falling back to ${FALLBACK[plan]}`);
    return FALLBACK[plan];
  }
  return Math.floor(parsed);
}

const COPY: Record<Plan, Omit<PlanDefinition, "priceRupees" | "pricePaisa">> = {
  FREE: {
    plan: "FREE",
    label: "Free listing",
    benefits: [
      "Unlimited stock updates",
      "Appear in nearby search and on the map",
      "Patients can send you availability requests",
      "Chat with patients",
    ],
    rank: 0,
    paid: false,
  },
  VERIFIED: {
    plan: "VERIFIED",
    label: "Verified fast-track",
    benefits: [
      "Everything in Free",
      "Verified badge — patients see you are license-checked",
      "Priority in the verification queue",
      "Expiry, MRP and near-expiry alerts",
    ],
    rank: 1,
    paid: true,
  },
  FEATURED: {
    plan: "FEATURED",
    label: "Top placement",
    benefits: [
      "Everything in Verified",
      "Pinned above free listings in search results, labelled as sponsored",
      "Missed-demand inbox: what people searched for and you did not stock",
      "CSV bulk import/export",
    ],
    rank: 2,
    paid: true,
  },
};

export function getPlanCatalog(): PlanDefinition[] {
  return PLANS.map((plan) => {
    const priceRupees = priceRupeesFor(plan);
    return { ...COPY[plan], priceRupees, pricePaisa: priceRupees * 100 };
  });
}

export function getPlan(plan: Plan): PlanDefinition {
  return getPlanCatalog().find((p) => p.plan === plan)!;
}

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLANS as readonly string[]).includes(value);
}

/** The effective tier: a lapsed paid plan reads as FREE. */
export function effectivePlan(plan: Plan, planExpiresAt: Date | null, now: Date = new Date()): Plan {
  if (plan === "FREE") return "FREE";
  if (!planExpiresAt) return "FREE";
  return planExpiresAt.getTime() > now.getTime() ? plan : "FREE";
}

export function isPlanActive(plan: Plan, planExpiresAt: Date | null, now: Date = new Date()): boolean {
  return effectivePlan(plan, planExpiresAt, now) !== "FREE";
}

/**
 * Renewal start: extend from the current expiry when still live (so a renewal
 * does not discard paid time), otherwise from now.
 */
export function renewalStart(planExpiresAt: Date | null, now: Date = new Date()): Date {
  if (planExpiresAt && planExpiresAt.getTime() > now.getTime()) return planExpiresAt;
  return now;
}

export function expiryAfterPurchase(from: Date = new Date(), days = PLAN_PERIOD_DAYS): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Days remaining, floored at 0. `null` when the plan is not paid. */
export function daysRemaining(plan: Plan, planExpiresAt: Date | null, now: Date = new Date()): number | null {
  if (plan === "FREE" || !planExpiresAt) return null;
  return Math.max(0, Math.ceil((planExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

// src/lib/stripe.ts
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  typescript: true,
});

// ─── TeamFlow Plan config ────────────────────────────────────────────────────

export const PLANS = {
  FREE: {
    name: "Free",
    slug: "free",
    price: 0,
    priceId: null,
    limits: {
      projects: 1,
      members: 2,
    },
    features: [
      "Personal to-do list (unlimited)",
      "1 project",
      "Up to 2 members",
      "Shared to-do list",
      "Community support",
    ],
  },
  PRO: {
    name: "Pro",
    slug: "pro",
    price: 19,
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? null,
    limits: {
      projects: -1, // unlimited
      members: 10,
    },
    features: [
      "Unlimited projects",
      "Up to 10 members (+$1/mo each extra)",
      "Client Portal",
      "AI Project Plan & Analysis",
      "Telegram + Email notifications",
      "Project templates",
      "Budget tracking",
      "Priority support",
    ],
  },
  AGENCY: {
    name: "Agency",
    slug: "agency",
    price: 49,
    priceId: process.env.STRIPE_AGENCY_PRICE_ID ?? null,
    limits: {
      projects: -1,
      members: 25,
    },
    features: [
      "Unlimited projects",
      "Up to 25 members (+$1/mo each extra)",
      "White-label Client Portal",
      "All AI features",
      "AI Archive Insights",
      "Weekly AI reports",
      "Dedicated support",
      "SLA guarantee",
    ],
  },
} as const;

export type PlanSlug = keyof typeof PLANS;

export function getPlanBySlug(slug: string): (typeof PLANS)[PlanSlug] | null {
  const entry = Object.values(PLANS).find((p) => p.slug === slug);
  return entry ?? null;
}

export function getPlanByPriceId(priceId: string): (typeof PLANS)[PlanSlug] | null {
  const entry = Object.values(PLANS).find((p) => p.priceId === priceId);
  return entry ?? null;
}

export function getPlanLimits(slug: string): { projects: number; members: number } {
  const plan = getPlanBySlug(slug) ?? PLANS.FREE;
  return { projects: plan.limits.projects, members: plan.limits.members };
}

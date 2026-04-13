// src/app/api/stripe/plans/route.ts
import { NextResponse } from "next/server";
import { PLANS } from "@/lib/stripe";

export async function GET() {
  const plans = Object.entries(PLANS).map(([key, plan]) => ({
    key,
    name: plan.name,
    slug: plan.slug,
    price: plan.price,
    features: plan.features,
    limits: plan.limits,
    hasPriceId: !!plan.priceId,
  }));

  return NextResponse.json({ plans });
}
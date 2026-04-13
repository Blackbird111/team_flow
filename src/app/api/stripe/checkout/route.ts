// src/app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe, PLANS, type PlanSlug } from "@/lib/stripe";
import { getOrCreateStripeCustomer, getUserPrimaryWorkspace } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const checkoutSchema = z.object({
  planSlug: z.enum(["PRO", "AGENCY"]),
  workspaceId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { planSlug, workspaceId: bodyWorkspaceId } = parsed.data;
    const plan = PLANS[planSlug as PlanSlug];

    if (!plan.priceId) {
      return NextResponse.json(
        { error: `Price ID for plan "${planSlug}" is not configured` },
        { status: 500 }
      );
    }

    // Resolve workspace — guaranteed string after this block
    let resolvedWorkspaceId: string;
    if (bodyWorkspaceId) {
      resolvedWorkspaceId = bodyWorkspaceId;
    } else {
      const ws = await getUserPrimaryWorkspace(session.user.id);
      if (!ws) {
        return NextResponse.json({ error: "No workspace found" }, { status: 400 });
      }
      resolvedWorkspaceId = ws.id;
    }

    // Verify user is admin of this workspace
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: resolvedWorkspaceId, userId: session.user.id, role: "ADMIN" },
    });
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const customerId = await getOrCreateStripeCustomer(
      resolvedWorkspaceId,
      session.user.email,
      session.user.name
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // Check if workspace already has an active subscription
    const existingSubscription = await prisma.subscription.findUnique({
      where: { workspaceId: resolvedWorkspaceId },
      select: { stripeSubscriptionId: true },
    });

    if (existingSubscription?.stripeSubscriptionId) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(
          existingSubscription.stripeSubscriptionId
        );

        if (stripeSub.status === "active" || stripeSub.status === "trialing") {
          const itemId = stripeSub.items.data[0]?.id;
          if (!itemId) {
            return NextResponse.json(
              { error: "Could not find subscription item" },
              { status: 500 }
            );
          }

          // Use billing portal for plan changes on existing subscription
          const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${baseUrl}/dashboard`,
          });

          return NextResponse.json({ url: portalSession.url });
        }
      } catch {
        // subscription not found on Stripe — proceed to new checkout
      }
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard?success=true&plan=${plan.slug}`,
      cancel_url: `${baseUrl}/settings#billing`,
      subscription_data: {
        metadata: {
          workspaceId: resolvedWorkspaceId,
          planSlug: plan.slug,
        },
      },
      metadata: {
        workspaceId: resolvedWorkspaceId,
        planSlug: plan.slug,
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[STRIPE_CHECKOUT]", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

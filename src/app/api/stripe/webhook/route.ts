// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getPlanByPriceId } from "@/lib/stripe";
import { slugToPlanEnum } from "@/lib/subscription";
import { SubStatus } from "@prisma/client";
import type Stripe from "stripe";

export const runtime = "nodejs";

async function getRawBody(req: NextRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = req.body?.getReader();
  if (!reader) return Buffer.alloc(0);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  const rawBody = await getRawBody(req);
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[WEBHOOK] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`[WEBHOOK] Processing: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await handleSubscriptionUpserted(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.paid": {
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      }
      case "invoice.payment_failed": {
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      }
      default:
        console.log(`[WEBHOOK] Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[WEBHOOK] Error processing ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { prisma } = await import("@/lib/prisma");

  const workspaceId = session.metadata?.workspaceId;
  if (!workspaceId) {
    console.error("[WEBHOOK] checkout.completed: missing workspaceId in metadata");
    return;
  }

  if (session.customer) {
    await prisma.subscription.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        stripeCustomerId: session.customer as string,
      },
      update: {
        stripeCustomerId: session.customer as string,
      },
    });
  }
}

async function handleSubscriptionUpserted(subscription: Stripe.Subscription) {
  const { prisma } = await import("@/lib/prisma");

  // Resolve workspaceId from metadata or existing subscription record
  let workspaceId: string | null = subscription.metadata?.workspaceId ?? null;

  if (!workspaceId) {
    const existing = await prisma.subscription.findFirst({
      where: { stripeCustomerId: subscription.customer as string },
      select: { workspaceId: true },
    });
    workspaceId = existing?.workspaceId ?? null;
  }

  if (!workspaceId) {
    console.error(
      `[WEBHOOK] Cannot find workspace for customer ${subscription.customer}`
    );
    return;
  }

  const priceId = subscription.items.data[0]?.price.id ?? null;
  const plan = priceId ? getPlanByPriceId(priceId) : null;
  const planEnum = slugToPlanEnum(plan?.slug ?? "free");
  const statusEnum = stripeStatusToEnum(subscription.status);

  // Stripe v17+: period_end may be on item or top-level
  const sub = subscription as unknown as Record<string, unknown>;
  const periodEnd =
    typeof sub["current_period_end"] === "number"
      ? new Date((sub["current_period_end"] as number) * 1000)
      : typeof (subscription.items.data[0] as unknown as Record<string, unknown>)?.["current_period_end"] === "number"
        ? new Date(((subscription.items.data[0] as unknown as Record<string, unknown>)["current_period_end"] as number) * 1000)
        : null;

  await prisma.subscription.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      plan: planEnum,
      status: statusEnum,
      stripeCurrentPeriodEnd: periodEnd,
    },
    update: {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      plan: planEnum,
      status: statusEnum,
      stripeCurrentPeriodEnd: periodEnd,
    },
  });

  console.log(
    `[WEBHOOK] Upserted: workspaceId=${workspaceId}, plan=${planEnum}, status=${statusEnum}`
  );
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { prisma } = await import("@/lib/prisma");

  const existing = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!existing) return;

  await prisma.subscription.update({
    where: { id: existing.id },
    data: {
      status: SubStatus.CANCELED,
      plan: "FREE",
    },
  });

  console.log(`[WEBHOOK] Canceled: workspaceId=${existing.workspaceId}`);
}

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const inv = invoice as unknown as Record<string, unknown>;

  const parent = inv["parent"] as Record<string, unknown> | undefined;
  if (parent?.["type"] === "subscription_details") {
    const details = parent["subscription_details"] as Record<string, unknown> | undefined;
    const subId = details?.["subscription"];
    if (typeof subId === "string") return subId;
  }

  const legacySubId = inv["subscription"];
  if (typeof legacySubId === "string") return legacySubId;

  return null;
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await handleSubscriptionUpserted(subscription);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const { prisma } = await import("@/lib/prisma");

  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const existing = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!existing) return;

  await prisma.subscription.update({
    where: { id: existing.id },
    data: { status: SubStatus.PAST_DUE },
  });

  console.log(`[WEBHOOK] Payment failed: workspaceId=${existing.workspaceId}`);
}

function stripeStatusToEnum(status: Stripe.Subscription.Status): SubStatus {
  switch (status) {
    case "active":
    case "trialing":
      return SubStatus.ACTIVE;
    case "canceled":
      return SubStatus.CANCELED;
    case "past_due":
    case "unpaid":
      return SubStatus.PAST_DUE;
    default:
      return SubStatus.INACTIVE;
  }
}

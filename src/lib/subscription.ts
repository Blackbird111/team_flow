// src/lib/subscription.ts
import { prisma } from "@/lib/prisma";
import { getPlanBySlug, getPlanLimits, PLANS } from "@/lib/stripe";
import { WorkspacePlan, SubStatus } from "@prisma/client";

// ─── Map WorkspacePlan enum → slug ──────────────────────────────────────────

export function planEnumToSlug(plan: WorkspacePlan): string {
  return plan.toLowerCase();
}

export function slugToPlanEnum(slug: string): WorkspacePlan {
  const map: Record<string, WorkspacePlan> = {
    free: WorkspacePlan.FREE,
    pro: WorkspacePlan.PRO,
    agency: WorkspacePlan.AGENCY,
  };
  return map[slug.toLowerCase()] ?? WorkspacePlan.FREE;
}

// ─── Get workspace subscription ─────────────────────────────────────────────

export async function getWorkspaceSubscription(workspaceId: string) {
  return prisma.subscription.findUnique({
    where: { workspaceId },
  });
}

// ─── Get workspace plan slug ─────────────────────────────────────────────────

export async function getWorkspacePlanSlug(workspaceId: string): Promise<string> {
  const subscription = await getWorkspaceSubscription(workspaceId);

  if (!subscription) return "free";
  if (subscription.status !== SubStatus.ACTIVE) return "free";

  if (
    subscription.stripeCurrentPeriodEnd &&
    subscription.stripeCurrentPeriodEnd < new Date()
  ) {
    return "free";
  }

  return planEnumToSlug(subscription.plan);
}

// ─── Get first workspace for a user ──────────────────────────────────────────
// Owners first, then workspaces the user was invited into as a member.

export async function getUserPrimaryWorkspace(userId: string) {
  // 1. User owns a workspace
  const owned = await prisma.workspace.findFirst({
    where: { ownerId: userId },
    include: { subscription: true },
    orderBy: { createdAt: "asc" },
  });
  if (owned) return owned;

  // 2. User is a member of someone else's workspace
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspace: { include: { subscription: true } } },
    orderBy: { createdAt: "asc" },
  });
  return membership?.workspace ?? null;
}

// ─── Get workspace usage stats ───────────────────────────────────────────────

export async function getWorkspaceUsageStats(workspaceId: string) {
  const [planSlug, memberCount] = await Promise.all([
    getWorkspacePlanSlug(workspaceId),
    prisma.workspaceMember.count({ where: { workspaceId } }),
  ]);

  const limits = getPlanLimits(planSlug);
  const plan = getPlanBySlug(planSlug) ?? PLANS.FREE;

  return {
    plan: planSlug,
    planName: plan.name,
    members: {
      used: memberCount,
      limit: limits.members,
      unlimited: limits.members === -1,
    },
    projects: {
      limit: limits.projects,
      unlimited: limits.projects === -1,
    },
  };
}

// ─── Check if workspace can add member ───────────────────────────────────────

export async function canWorkspaceAddMember(workspaceId: string): Promise<{
  allowed: boolean;
  reason?: string;
  used: number;
  limit: number;
}> {
  const planSlug = await getWorkspacePlanSlug(workspaceId);
  const limits = getPlanLimits(planSlug);

  if (limits.members === -1) {
    return { allowed: true, used: 0, limit: -1 };
  }

  const used = await prisma.workspaceMember.count({ where: { workspaceId } });
  const limit = limits.members;

  if (used >= limit) {
    return {
      allowed: false,
      reason: `Your ${planSlug} plan allows up to ${limit} members. Upgrade to add more.`,
      used,
      limit,
    };
  }

  return { allowed: true, used, limit };
}

// ─── Check if workspace can create project ───────────────────────────────────

export async function canWorkspaceCreateProject(workspaceId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const planSlug = await getWorkspacePlanSlug(workspaceId);
  const limits = getPlanLimits(planSlug);

  if (limits.projects === -1) {
    return { allowed: true };
  }

  const count = await prisma.project.count({
    where: { workspaceId, status: { not: "ARCHIVED" } },
  });

  if (count >= limits.projects) {
    return {
      allowed: false,
      reason: `Your free plan allows ${limits.projects} active project. Upgrade to Pro to create unlimited projects.`,
    };
  }

  return { allowed: true };
}

// ─── Get or create Stripe customer for workspace ─────────────────────────────

export async function getOrCreateStripeCustomer(
  workspaceId: string,
  email: string,
  name?: string | null
): Promise<string> {
  const { stripe } = await import("@/lib/stripe");

  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId },
    select: { stripeCustomerId: true },
  });

  if (subscription?.stripeCustomerId) {
    return subscription.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { workspaceId },
  });

  await prisma.subscription.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      stripeCustomerId: customer.id,
      plan: WorkspacePlan.FREE,
      status: SubStatus.ACTIVE,
    },
    update: {
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}

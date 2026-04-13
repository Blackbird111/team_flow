// src/app/api/cron/emails/route.ts
// Vercel Cron job — runs daily at 9:00 UTC.
// Processes: onboarding sequences, re-engagement, monthly newsletter.
// Protected by CRON_SECRET header.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendOnboardingStep,
  sendReEngagement,
  sendMonthlyNewsletter,
  ONBOARDING_STEPS,
} from "@/lib/marketing-emails";
import crypto from "crypto";

export const runtime = "nodejs";

function unsubToken(userId: string): string {
  // Deterministic token: HMAC of userId with the app secret
  const secret = process.env.AUTH_SECRET ?? "dev-secret";
  return crypto.createHmac("sha256", secret).update(userId).digest("hex");
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const today = now.getDate();
  const isFirstOfMonth = today === 1;

  let onboardingSent = 0;
  let reEngagementSent = 0;
  let newsletterSent = 0;

  // ── Onboarding sequence ──────────────────────────────────────
  // Find all users who haven't completed all 5 onboarding steps and haven't opted out
  const onboardingCandidates = await prisma.user.findMany({
    where: {
      marketingOptOut: false,
      email: { not: undefined },
      onboardingEmailStep: { lt: ONBOARDING_STEPS.length },
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      onboardingEmailStep: true,
    },
  });

  for (const user of onboardingCandidates) {
    const nextStepIndex = user.onboardingEmailStep; // 0-based index into ONBOARDING_STEPS
    const nextStep = ONBOARDING_STEPS[nextStepIndex];
    if (!nextStep) continue;

    const daysSinceSignup = Math.floor(
      (now.getTime() - user.createdAt.getTime()) / 86_400_000
    );

    if (daysSinceSignup >= nextStep.delayDays) {
      await sendOnboardingStep(
        user.email,
        user.name ?? "there",
        nextStep.step,
        unsubToken(user.id),
      );
      await prisma.user.update({
        where: { id: user.id },
        data: { onboardingEmailStep: nextStepIndex + 1 },
      });
      onboardingSent++;
    }
  }

  // ── Re-engagement ────────────────────────────────────────────
  // Users who haven't been active for 14+ days and haven't opted out
  const reEngageCutoff = new Date(now.getTime() - 14 * 86_400_000);
  const reEngageCandidates = await prisma.user.findMany({
    where: {
      marketingOptOut: false,
      email: { not: undefined },
      OR: [
        { lastActiveAt: { lt: reEngageCutoff } },
        { lastActiveAt: null, createdAt: { lt: reEngageCutoff } },
      ],
    },
    select: { id: true, email: true, name: true, lastActiveAt: true },
  });

  for (const user of reEngageCandidates) {
    await sendReEngagement(user.email, user.name ?? "there", unsubToken(user.id));
    // Update lastActiveAt so we don't spam them — next re-engagement in another 14 days
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: now },
    });
    reEngagementSent++;
  }

  // ── Monthly newsletter ────────────────────────────────────────
  if (isFirstOfMonth) {
    const newsletterCandidates = await prisma.user.findMany({
      where: {
        marketingOptOut: false,
        email: { not: undefined },
        emailVerified: { not: null }, // only verified emails
      },
      select: { id: true, email: true, name: true },
    });

    for (const user of newsletterCandidates) {
      await sendMonthlyNewsletter(user.email, user.name ?? "there", unsubToken(user.id));
      newsletterSent++;
    }
  }

  console.log(`[CRON_EMAILS] onboarding=${onboardingSent} reEngagement=${reEngagementSent} newsletter=${newsletterSent}`);

  return NextResponse.json({
    ok: true,
    onboardingSent,
    reEngagementSent,
    newsletterSent,
  });
}

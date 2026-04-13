// src/lib/marketing-emails.ts
// Marketing email sequences: onboarding, re-engagement, monthly newsletter.
// All sent via Resend. Includes GDPR-compliant unsubscribe links.

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_MARKETING_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? "hello@teamflow.app";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ─── Email template ───────────────────────────────────────────────────────────

function layout(
  preheader: string,
  title: string,
  body: string,
  ctaHref?: string,
  ctaLabel?: string,
  unsubToken?: string,
): string {
  const unsubUrl = unsubToken
    ? `${APP_URL}/unsubscribe?token=${unsubToken}`
    : `${APP_URL}/settings`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="display:none;max-height:0;overflow:hidden">${preheader}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
        <!-- Header -->
        <tr>
          <td style="background:#7c3aed;padding:20px 32px">
            <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px">TeamFlow</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <h1 style="margin:0 0 16px;font-size:22px;color:#111827;line-height:1.3">${title}</h1>
            ${body}
            ${ctaHref && ctaLabel
              ? `<p style="margin:28px 0 0"><a href="${ctaHref}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">${ctaLabel}</a></p>`
              : ""}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;background:#f9fafb">
            <p style="margin:0;font-size:12px;color:#9ca3af">
              You're receiving this because you signed up for TeamFlow.<br>
              <a href="${unsubUrl}" style="color:#9ca3af">Unsubscribe</a> &nbsp;·&nbsp;
              <a href="${APP_URL}" style="color:#9ca3af">TeamFlow</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function p(text: string) {
  return `<p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.6">${text}</p>`;
}

function li(items: string[]) {
  return `<ul style="margin:0 0 14px;padding-left:20px">${items.map((i) => `<li style="font-size:15px;color:#374151;line-height:1.6;margin-bottom:6px">${i}</li>`).join("")}</ul>`;
}

// ─── Onboarding sequence (5 emails) ──────────────────────────────────────────

// Step delays in days from account creation
export const ONBOARDING_STEPS: { step: number; delayDays: number }[] = [
  { step: 1, delayDays: 0 },   // immediately on signup
  { step: 2, delayDays: 2 },   // day 2
  { step: 3, delayDays: 5 },   // day 5
  { step: 4, delayDays: 9 },   // day 9
  { step: 5, delayDays: 14 },  // day 14
];

function onboardingEmail(step: number, name: string, unsubToken: string): { subject: string; html: string } | null {
  const firstName = name?.split(" ")[0] ?? "there";

  switch (step) {
    case 1:
      return {
        subject: "Welcome to TeamFlow — you're all set",
        html: layout(
          "Get your first project up and running in 5 minutes.",
          `Welcome to TeamFlow, ${firstName}!`,
          p("You've just unlocked a better way to manage client work. No more scattered spreadsheets, no endless Slack threads — everything in one place.") +
          p("Here's what to do first:") +
          li([
            "<b>Create your workspace</b> — name it after your agency",
            "<b>Invite your team</b> — add members from Settings",
            "<b>Create your first project</b> — it takes 30 seconds",
          ]) +
          p("Your free plan includes 1 project and 3 members — plenty to get started."),
          `${APP_URL}/dashboard`,
          "Go to Dashboard →",
          unsubToken,
        ),
      };

    case 2:
      return {
        subject: "The one feature agencies love most in TeamFlow",
        html: layout(
          "Multi-assignee tasks with per-person completion tracking.",
          "Built for how agencies actually work",
          p(`Hey ${firstName},`) +
          p("Most project tools treat tasks as single-owner todos. But agency work is collaborative — a task might need sign-off from a designer, a developer, and a PM.") +
          p("TeamFlow handles this natively:") +
          li([
            "Assign a task to <b>multiple people</b> at once",
            "Each person marks their part done independently",
            "Task only completes when <b>everyone</b> is done",
            "You see a live indicator — ✓ Alice · ○ Boris · ○ Victor",
          ]) +
          p("This eliminates the most common source of confusion on client projects."),
          `${APP_URL}/dashboard`,
          "Try it now →",
          unsubToken,
        ),
      };

    case 3:
      return {
        subject: "Your clients want to see progress — show them",
        html: layout(
          "The Client Portal is your secret weapon for fewer check-in calls.",
          "Stop the 'any updates?' emails",
          p(`Hi ${firstName},`) +
          p("Every agency PM knows the drill: the client sends 'any updates?' on Friday afternoon. You're mid-sprint. It derails your entire afternoon.") +
          p("TeamFlow's Client Portal fixes this:") +
          li([
            "Enable a <b>read-only portal link</b> for each project",
            "Share it with your client — no login required",
            "They see task progress, deadlines, and team activity",
            "They can even <b>submit requests</b> that you convert to tasks",
          ]) +
          p("Clients who can see progress in real time make 60% fewer check-in requests."),
          `${APP_URL}/dashboard`,
          "Enable the Client Portal →",
          unsubToken,
        ),
      };

    case 4:
      return {
        subject: "Is your project on budget? TeamFlow knows",
        html: layout(
          "Automatic budget tracking based on time logs × hourly rates.",
          "Never go over budget by surprise",
          p(`Hey ${firstName},`) +
          p("Budget overruns are the #1 cause of strained client relationships. Usually, you only find out when it's too late.") +
          p("TeamFlow tracks budget automatically:") +
          li([
            "Set a project budget in USD",
            "Set hourly rates per team member",
            "Time logs automatically calculate spend",
            "Get <b>alerts at 80% and 100%</b> via email or Telegram",
          ]) +
          p("The dashboard shows you a live budget bar so you always know where you stand."),
          `${APP_URL}/dashboard`,
          "Set your first budget →",
          unsubToken,
        ),
      };

    case 5:
      return {
        subject: "One thing most agencies never do (but should)",
        html: layout(
          "Project templates save 2+ hours on every new project.",
          "Stop starting from scratch",
          p(`Hi ${firstName},`) +
          p("The agencies that scale fastest have one thing in common: they don't reinvent the wheel for every new project.") +
          p("TeamFlow's project templates make this effortless:") +
          li([
            "Finish a project → save it as a template in one click",
            "Start a new similar project → load the template",
            "All sections and tasks are copied instantly",
            "Just assign team members and you're ready to go",
          ]) +
          p("Upgrade to Pro to access unlimited projects and unlock all features — starting at just $19/month."),
          `${APP_URL}/dashboard/settings/billing`,
          "View Pro plans →",
          unsubToken,
        ),
      };

    default:
      return null;
  }
}

// ─── Re-engagement email ──────────────────────────────────────────────────────

function reEngagementEmail(name: string, unsubToken: string): { subject: string; html: string } {
  const firstName = name?.split(" ")[0] ?? "there";
  return {
    subject: `${firstName}, your projects are waiting`,
    html: layout(
      "Pick up where you left off — your workspace is ready.",
      "We miss you at TeamFlow",
      p(`Hi ${firstName},`) +
      p("You haven't logged in for a while. Your workspace and projects are still here, exactly as you left them.") +
      p("Here's what you might have missed:") +
      li([
        "AI Project Analysis — get instant risk and workload insights",
        "Weekly client reports — generated automatically by Claude",
        "Client Portal — let clients track progress without a login",
      ]) +
      p("Come back and see what TeamFlow can do for your agency."),
      `${APP_URL}/dashboard`,
      "Go to my workspace →",
      unsubToken,
    ),
  };
}

// ─── Monthly newsletter ───────────────────────────────────────────────────────

function monthlyNewsletterEmail(name: string, month: string, unsubToken: string): { subject: string; html: string } {
  const firstName = name?.split(" ")[0] ?? "there";
  return {
    subject: `Agency productivity tips — ${month}`,
    html: layout(
      "Three things top agencies do differently.",
      `${month} — Agency Productivity Tips`,
      p(`Hi ${firstName},`) +
      p("Here are three things the most productive digital agencies do every month to stay ahead:") +
      p("<b>1. Weekly client reviews (15 minutes)</b>") +
      p("A short sync every Friday prevents scope creep. Walk through what's done, what's next, and any blockers. Clients who feel informed are clients who don't micromanage.") +
      p("<b>2. Time budget check-ins</b>") +
      p("Review time logged vs. budget at the 50% project milestone — not at the end. Catching overruns early means you can renegotiate or reprioritize before the damage is done.") +
      p("<b>3. Post-project retrospectives</b>") +
      p("After every project, ask: What took longer than estimated? What would we do differently? Save those insights as project template notes. Over time, your estimates become accurate.") +
      p("TeamFlow's Archive and AI Insights features are built exactly for this."),
      `${APP_URL}/dashboard`,
      "Open TeamFlow →",
      unsubToken,
    ),
  };
}

// ─── Send helpers ─────────────────────────────────────────────────────────────

async function send(to: string, subject: string, html: string): Promise<void> {
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("[MARKETING_EMAIL] send error", err);
  }
}

export async function sendOnboardingStep(
  to: string,
  name: string,
  step: number,
  unsubToken: string,
): Promise<void> {
  const email = onboardingEmail(step, name, unsubToken);
  if (!email) return;
  await send(to, email.subject, email.html);
}

export async function sendReEngagement(
  to: string,
  name: string,
  unsubToken: string,
): Promise<void> {
  const email = reEngagementEmail(name, unsubToken);
  await send(to, email.subject, email.html);
}

export async function sendMonthlyNewsletter(
  to: string,
  name: string,
  unsubToken: string,
): Promise<void> {
  const month = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date());
  const email = monthlyNewsletterEmail(name, month, unsubToken);
  await send(to, email.subject, email.html);
}

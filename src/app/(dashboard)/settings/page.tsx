import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserPrimaryWorkspace } from "@/lib/subscription";
import { ProfileForm } from "@/components/settings/profile-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { TelegramForm } from "@/components/settings/telegram-form";
import { MarketingOptOutForm } from "@/components/settings/marketing-opt-out-form";
import { ManageBillingButton } from "@/components/billing/manage-billing-button";
import { SubscriptionBadge } from "@/components/billing/subscription-badge";
import { SubStatus } from "@prisma/client";
import { PLANS } from "@/lib/stripe";
import { CreditCard } from "lucide-react";

export const runtime = "nodejs";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, workspace] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    getUserPrimaryWorkspace(session.user.id),
  ]);
  if (!user) redirect("/login");

  const wsMember = workspace
    ? await prisma.workspaceMember.findFirst({
        where: { workspaceId: workspace.id, userId: session.user.id },
        select: { telegramChatId: true },
      })
    : null;
  const subscription = workspace?.subscription;
  const plan = (subscription?.plan ?? "FREE").toLowerCase();
  const planKey = plan.toUpperCase() as keyof typeof PLANS;
  const planConfig = PLANS[planKey] ?? PLANS.FREE;
  const isOAuthUser = !user.password;
  const periodEnd = subscription?.stripeCurrentPeriodEnd;
  const status = subscription?.status;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account preferences and subscription.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: forms */}
        <div className="lg:col-span-2 space-y-6">
          <div id="profile" className="scroll-mt-24">
            <ProfileForm
              initialName={user.name ?? ""}
              email={user.email ?? ""}
            />
          </div>

          <div id="password" className="scroll-mt-24">
            {isOAuthUser ? (
              <div className="rounded-xl border bg-card p-6 shadow-sm opacity-60">
                <h3 className="font-semibold mb-1">Change Password</h3>
                <p className="text-sm text-muted-foreground">
                  You signed in with OAuth (Google). Password management is not available.
                </p>
              </div>
            ) : (
              <ChangePasswordForm />
            )}
          </div>

          {workspace && (
            <div id="telegram" className="scroll-mt-24">
              <TelegramForm initialChatId={wsMember?.telegramChatId ?? null} />
            </div>
          )}

          <div id="marketing" className="scroll-mt-24">
            <MarketingOptOutForm initialOptOut={user.marketingOptOut ?? false} />
          </div>
        </div>

        {/* Right: billing */}
        <div className="space-y-4">
          <div id="billing" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold">Subscription</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan</span>
                <SubscriptionBadge plan={plan} />
              </div>
              {status && plan !== "free" && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className={`text-sm font-medium ${
                    status === SubStatus.ACTIVE ? "text-emerald-500" :
                    status === SubStatus.CANCELED ? "text-red-500" : "text-muted-foreground"
                  }`}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </span>
                </div>
              )}
              {periodEnd && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Renews on</span>
                  <span className="text-sm font-medium">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    }).format(periodEnd)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Members</span>
                <span className="text-sm font-medium">
                  {(planConfig.limits.members as number) === -1 ? "Unlimited" : `Up to ${planConfig.limits.members}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Projects</span>
                <span className="text-sm font-medium">
                  {(planConfig.limits.projects as number) === -1 ? "Unlimited" : `${planConfig.limits.projects}`}
                </span>
              </div>
            </div>

            {plan !== "free" && (
              <div className="mt-4">
                <ManageBillingButton />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
            <h3 className="font-semibold text-red-600 dark:text-red-400 mb-1">
              Danger Zone
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Contact support to delete your account.
            </p>
            <button
              disabled
              className="w-full rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-500 opacity-50 cursor-not-allowed"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

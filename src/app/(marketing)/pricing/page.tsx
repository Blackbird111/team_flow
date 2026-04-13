// src/app/(marketing)/pricing/page.tsx
import { auth } from "@/lib/auth";
import { getUserPrimaryWorkspace, getWorkspacePlanSlug } from "@/lib/subscription";
import { PLANS } from "@/lib/stripe";
import { PricingCard } from "@/components/billing/pricing-card";

export const metadata = {
  title: "Pricing — TeamFlow",
  description: "Simple, transparent pricing for agencies and freelance studios.",
};

export default async function PricingPage() {
  const session = await auth();
  let currentPlanSlug = "free";

  if (session?.user?.id) {
    const workspace = await getUserPrimaryWorkspace(session.user.id);
    if (workspace) {
      currentPlanSlug = await getWorkspacePlanSlug(workspace.id);
    }
  }

  const plans: {
    key: "FREE" | "PRO" | "AGENCY";
    name: string;
    price: number;
    features: readonly string[];
    slug: string;
    isPopular: boolean;
  }[] = [
    { key: "FREE",   ...PLANS.FREE,   isPopular: false },
    { key: "PRO",    ...PLANS.PRO,    isPopular: true  },
    { key: "AGENCY", ...PLANS.AGENCY, isPopular: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-4 py-20">
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Start for free. Upgrade when you need more. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, index) => (
            <PricingCard
              key={plan.key}
              planKey={plan.key}
              name={plan.name}
              price={plan.price}
              features={[...plan.features]}
              isPopular={plan.isPopular}
              isCurrentPlan={currentPlanSlug === plan.slug}
              index={index}
            />
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-12">
          Annual billing saves 20%.{" "}
          <a
            href="mailto:support@teamflow.app"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Questions? Contact us.
          </a>
        </p>
      </div>
    </div>
  );
}

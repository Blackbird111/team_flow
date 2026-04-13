// src/components/billing/subscription-badge.tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SubscriptionBadgeProps {
  plan: string;
  className?: string;
}

const planStyles: Record<string, string> = {
  free: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  pro: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  agency: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

const planLabels: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  agency: "Agency",
};

export function SubscriptionBadge({ plan, className }: SubscriptionBadgeProps) {
  const slug = plan.toLowerCase();

  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-medium text-xs px-2 py-0.5",
        planStyles[slug] ?? planStyles.free,
        className
      )}
    >
      {planLabels[slug] ?? plan}
    </Badge>
  );
}

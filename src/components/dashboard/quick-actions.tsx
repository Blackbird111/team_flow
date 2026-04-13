"use client";
import Link from "next/link";
import { FolderOpen, CreditCard, Settings, ArrowRight, Zap } from "lucide-react";
import { useCheckout } from "@/hooks/useCheckout";

interface QuickActionsProps {
  plan: string;
}

export function QuickActions({ plan }: QuickActionsProps) {
  const { startCheckout, isLoading } = useCheckout();

  const actions = [
    {
      title: "View Projects",
      description: "Open your workspace projects",
      icon: FolderOpen,
      href: "/dashboard",
    },
    {
      title: "Manage Billing",
      description: "View invoices & subscription",
      icon: CreditCard,
      href: "/settings#billing",
    },
    {
      title: "Account Settings",
      description: "Update your profile",
      icon: Settings,
      href: "/settings",
    },
  ];

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Quick Actions</h3>
      <div className="space-y-3">
        {actions.map((action) => (
          <Link key={action.title} href={action.href}>
            <div className="group flex items-center gap-3 rounded-lg border p-3 transition-all hover:bg-accent hover:border-primary/20 cursor-pointer">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <action.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all" />
            </div>
          </Link>
        ))}
        {plan === "FREE" && (
          <button
            onClick={() => startCheckout("PRO")}
            disabled={isLoading}
            className="group w-full flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 transition-all hover:bg-primary/10 hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/20">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-primary">Upgrade to Pro</p>
              <p className="text-xs text-muted-foreground">Unlimited projects + Client Portal</p>
            </div>
            <ArrowRight className="h-4 w-4 text-primary" />
          </button>
        )}
      </div>
    </div>
  );
}

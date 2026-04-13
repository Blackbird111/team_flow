// src/components/billing/upgrade-button.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useCheckout } from "@/hooks/useCheckout";
import { Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type PlanKey = "PRO" | "AGENCY";

interface UpgradeButtonProps {
  planKey: PlanKey;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  children?: React.ReactNode;
}

export function UpgradeButton({
  planKey,
  className,
  variant = "default",
  size = "default",
  children,
}: UpgradeButtonProps) {
  const { startCheckout, isLoading } = useCheckout();

  return (
    <Button
      onClick={() => startCheckout(planKey)}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Zap className="h-4 w-4" />
      )}
      {children ?? "Upgrade"}
    </Button>
  );
}
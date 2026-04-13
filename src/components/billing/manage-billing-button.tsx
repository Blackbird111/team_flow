// src/components/billing/manage-billing-button.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useCheckout } from "@/hooks/useCheckout";
import { Loader2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface ManageBillingButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function ManageBillingButton({
  className,
  variant = "outline",
  size = "default",
}: ManageBillingButtonProps) {
  const { openBillingPortal, isLoading } = useCheckout();

  return (
    <Button
      onClick={openBillingPortal}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="h-4 w-4" />
      )}
      Manage Billing
    </Button>
  );
}
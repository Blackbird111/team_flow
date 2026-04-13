// src/components/billing/pricing-card.tsx
"use client";

import { motion } from "framer-motion";
import { Check, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCheckout } from "@/hooks/useCheckout";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  planKey: "FREE" | "PRO" | "AGENCY";
  name: string;
  price: number;
  features: string[];
  isPopular?: boolean;
  isCurrentPlan?: boolean;
  index?: number;
}

export function PricingCard({
  planKey,
  name,
  price,
  features,
  isPopular = false,
  isCurrentPlan = false,
  index = 0,
}: PricingCardProps) {
  const { startCheckout, isLoading } = useCheckout();
  const isFree = planKey === "FREE";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="relative flex"
    >
      {isPopular && (
        <div className="absolute -top-3.5 left-0 right-0 flex justify-center z-10">
          <Badge className="bg-violet-600 text-white hover:bg-violet-600 px-3 py-0.5 text-xs font-semibold shadow-lg">
            Most Popular
          </Badge>
        </div>
      )}

      <Card
        className={cn(
          "relative flex flex-col w-full transition-all duration-300",
          isPopular
            ? "border-violet-500 shadow-xl shadow-violet-500/10 dark:border-violet-400"
            : "border-border hover:border-muted-foreground/30",
          isCurrentPlan && "ring-2 ring-violet-500"
        )}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">{name}</CardTitle>
            {isCurrentPlan && (
              <Badge
                variant="secondary"
                className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
              >
                Current Plan
              </Badge>
            )}
          </div>

          <div className="flex items-baseline gap-1 mt-3">
            {price === 0 ? (
              <span className="text-4xl font-extrabold">Free</span>
            ) : (
              <>
                <span className="text-4xl font-extrabold">${price}</span>
                <CardDescription className="text-base">/month</CardDescription>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-6">
          <ul className="space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm">
                <Check className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>

        <CardFooter>
          {isFree ? (
            <Button variant="outline" className="w-full" disabled>
              {isCurrentPlan ? "Current Plan" : "Get Started Free"}
            </Button>
          ) : isCurrentPlan ? (
            <Button variant="outline" className="w-full" disabled>
              Current Plan
            </Button>
          ) : (
            <Button
              className={cn(
                "w-full gap-2 font-semibold",
                isPopular ? "bg-violet-600 hover:bg-violet-700 text-white" : ""
              )}
              onClick={() => startCheckout(planKey as "PRO" | "AGENCY")}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Get {name}
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}

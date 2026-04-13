// src/hooks/useCheckout.ts
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type PlanKey = "PRO" | "AGENCY";

export function useCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();

  async function startCheckout(planSlug: PlanKey) {
    if (!session) {
      router.push(`/login?callbackUrl=/pricing`);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start checkout");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsLoading(false);
    }
  }

  async function openBillingPortal() {
    if (!session) {
      router.push(`/login?callbackUrl=/settings#billing`);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to open billing portal");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsLoading(false);
    }
  }

  return { startCheckout, openBillingPortal, isLoading, error };
}

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function UnsubscribePage() {
  const params = useSearchParams();
  const token = params.get("token");

  const [state, setState] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }

    fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        setState(res.ok ? "success" : "error");
      })
      .catch(() => setState("error"));
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        {state === "loading" && (
          <>
            <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Processing your request…</p>
          </>
        )}

        {state === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Unsubscribed</h1>
            <p className="text-muted-foreground mb-6">
              You've been removed from our marketing emails. You'll still receive important account and transactional emails.
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </>
        )}

        {state === "error" && (
          <>
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Link expired or invalid</h1>
            <p className="text-muted-foreground mb-6">
              This unsubscribe link is no longer valid. You can manage your email preferences from your account settings.
            </p>
            <Button asChild variant="outline">
              <Link href="/settings">Email Settings</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

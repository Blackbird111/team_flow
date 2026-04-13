"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";

interface AcceptInviteFormProps {
  token: string;
  workspaceName: string;
  email: string;
  isLoggedIn: boolean;
  loggedInEmail: string | null;
}

export function AcceptInviteForm({
  token,
  workspaceName,
  email,
  isLoggedIn,
  loggedInEmail,
}: AcceptInviteFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Not logged in — send to register/login with token in URL
  if (!isLoggedIn) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Sign in or create an account to join <strong>{workspaceName}</strong>.
        </p>
        <div className="flex flex-col gap-3">
          <Button asChild className="gap-2">
            <Link href={`/register?invite=${token}&email=${encodeURIComponent(email)}`}>
              <UserPlus className="h-4 w-4" />
              Create account
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href={`/login?invite=${token}`}>
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const emailMismatch =
    loggedInEmail && loggedInEmail.toLowerCase() !== email.toLowerCase();

  async function handleAccept() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workspaces/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to accept invite");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
      {emailMismatch && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            This invite was sent to <strong>{email}</strong>, but you&apos;re signed in
            as <strong>{loggedInEmail}</strong>. You can still accept.
          </p>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        You&apos;re signed in as <strong>{loggedInEmail}</strong>.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        className="w-full gap-2"
        onClick={handleAccept}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        Join {workspaceName}
      </Button>
    </div>
  );
}

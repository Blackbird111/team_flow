"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, X, Check } from "lucide-react";

export function InviteMemberButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/workspaces/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role: "MEMBER" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send invite");
        return;
      }
      setSent(true);
      setEmail("");
      setTimeout(() => { setSent(false); setOpen(false); }, 2500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Invite Member
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 rounded-xl border bg-card p-4 shadow-sm"
    >
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="invite-email" className="text-xs">Email address</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="colleague@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading || sent}
          autoFocus
          className="h-9"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <Button
        type="submit"
        size="sm"
        className="h-9 gap-1.5 shrink-0"
        disabled={isLoading || sent || !email.trim()}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : sent ? (
          <><Check className="h-4 w-4" /> Sent!</>
        ) : (
          "Send invite"
        )}
      </Button>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-9 w-9 p-0 shrink-0"
        onClick={() => { setOpen(false); setError(null); setEmail(""); }}
        disabled={isLoading}
      >
        <X className="h-4 w-4" />
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

export function MarketingOptOutForm({ initialOptOut }: { initialOptOut: boolean }) {
  const [optOut, setOptOut] = useState(initialOptOut);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const newVal = !optOut;
    setSaving(true);
    try {
      await fetch("/api/user/marketing-opt-out", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optOut: newVal }),
      });
      setOptOut(newVal);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0 mt-0.5">
          <Mail className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Marketing Emails</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Onboarding tips, productivity guides, and monthly newsletters. You'll always receive transactional emails (task notifications, billing receipts).
          </p>
          <button
            onClick={toggle}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 ${
              optOut ? "bg-muted border border-border" : "bg-violet-600"
            }`}
            role="switch"
            aria-checked={!optOut}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                optOut ? "translate-x-1" : "translate-x-6"
              }`}
            />
          </button>
          <span className="ml-3 text-sm text-muted-foreground">
            {optOut ? "Unsubscribed from marketing emails" : "Subscribed to marketing emails"}
          </span>
        </div>
      </div>
    </div>
  );
}

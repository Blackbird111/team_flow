"use client";

import { useState } from "react";
import { Send, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ClientRequestForm({ portalSlug }: { portalSlug: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fields, setFields] = useState({
    clientName: "",
    clientEmail: "",
    title: "",
    description: "",
  });

  function set(key: keyof typeof fields, val: string) {
    setFields((p) => ({ ...p, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.clientName.trim() || !fields.title.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/${portalSlug}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: fields.clientName.trim(),
          clientEmail: fields.clientEmail.trim() || undefined,
          title: fields.title.trim(),
          description: fields.description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to submit request");
        return;
      }
      setSent(true);
      setFields({ clientName: "", clientEmail: "", title: "", description: "" });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Send className="h-4 w-4 text-violet-500" />
          </div>
          <div>
            <p className="font-medium text-sm">Submit a Request</p>
            <p className="text-xs text-muted-foreground">Have a question or need something? Let us know.</p>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && !sent && (
        <form onSubmit={handleSubmit} className="border-t border-border px-5 py-5 space-y-4 bg-card">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cr-name">Your name *</Label>
              <Input
                id="cr-name"
                value={fields.clientName}
                onChange={(e) => set("clientName", e.target.value)}
                placeholder="Jane Smith"
                disabled={sending}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cr-email">Email (optional)</Label>
              <Input
                id="cr-email"
                type="email"
                value={fields.clientEmail}
                onChange={(e) => set("clientEmail", e.target.value)}
                placeholder="jane@company.com"
                disabled={sending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cr-title">Request *</Label>
            <Input
              id="cr-title"
              value={fields.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Can we add a blog section?"
              disabled={sending}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cr-desc">Details (optional)</Label>
            <Textarea
              id="cr-desc"
              value={fields.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe what you need in more detail…"
              rows={3}
              disabled={sending}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            type="submit"
            className="gap-2"
            disabled={sending || !fields.clientName.trim() || !fields.title.trim()}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send request
          </Button>
        </form>
      )}

      {open && sent && (
        <div className="border-t border-border px-5 py-8 bg-card flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Check className="h-6 w-6 text-emerald-500" />
          </div>
          <p className="font-medium">Request sent!</p>
          <p className="text-sm text-muted-foreground">The project team will review it and get back to you.</p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Submit another
          </button>
        </div>
      )}
    </div>
  );
}

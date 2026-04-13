"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Check, Loader2, ExternalLink } from "lucide-react";

interface TelegramFormProps {
  initialChatId: string | null;
}

export function TelegramForm({ initialChatId }: TelegramFormProps) {
  const [chatId, setChatId] = useState(initialChatId ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    const res = await fetch("/api/user/telegram", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramChatId: chatId.trim() || null }),
    });
    setIsSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to save");
    }
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#229ED9]/10">
          <Send className="h-4 w-4 text-[#229ED9]" />
        </div>
        <div>
          <h3 className="font-semibold">Telegram Notifications</h3>
          <p className="text-xs text-muted-foreground">
            Get task and comment notifications via Telegram
          </p>
        </div>
      </div>

      <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
        <li>
          Open{" "}
          <a
            href="https://t.me/userinfobot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-0.5"
          >
            @userinfobot <ExternalLink className="h-3 w-3" />
          </a>{" "}
          in Telegram and send any message
        </li>
        <li>Copy the <strong>Id</strong> number from the reply</li>
        <li>Paste it below and save</li>
      </ol>

      <form onSubmit={handleSave} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="telegram-chat-id">Your Telegram Chat ID</Label>
          <Input
            id="telegram-chat-id"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="e.g. 123456789"
            disabled={isSaving}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={isSaving || saved} className="gap-1.5">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <><Check className="h-4 w-4" /> Saved</>
            ) : (
              "Save"
            )}
          </Button>
          {chatId && !isSaving && (
            <button
              type="button"
              onClick={() => { setChatId(""); }}
              className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          )}
          {initialChatId && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="h-3 w-3" /> Connected
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

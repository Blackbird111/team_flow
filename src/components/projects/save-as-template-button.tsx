"use client";

import { useState } from "react";
import { BookmarkPlus, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SaveAsTemplateButtonProps {
  projectId: string;
}

export function SaveAsTemplateButton({ projectId }: SaveAsTemplateButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/save-as-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateName: name.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setName("");
      setTimeout(() => { setSaved(false); setOpen(false); }, 2000);
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to save template");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent"
        title="Save as template"
      >
        <BookmarkPlus className="h-3.5 w-3.5" />
        Save as template
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm"
    >
      <BookmarkPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Template name…"
        autoFocus
        disabled={saving || saved}
        className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground min-w-0"
      />
      {error && <span className="text-xs text-red-500 shrink-0">{error}</span>}
      <Button
        type="submit"
        size="sm"
        className="h-7 px-2 text-xs shrink-0"
        disabled={saving || saved || !name.trim()}
      >
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : saved ? (
          <><Check className="h-3 w-3" /> Saved</>
        ) : (
          "Save"
        )}
      </Button>
      <button
        type="button"
        onClick={() => { setOpen(false); setError(null); setName(""); }}
        className="text-muted-foreground hover:text-foreground transition-colors"
        disabled={saving}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}

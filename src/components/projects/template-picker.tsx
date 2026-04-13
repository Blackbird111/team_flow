"use client";

import { useState, useEffect } from "react";
import { LayoutTemplate, ChevronDown, ChevronUp, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  templateName: string | null;
  description: string | null;
  _count: { todoItems: number; todoSections: number };
}

interface TemplatePickerProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function TemplatePicker({ selectedId, onSelect }: TemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .finally(() => setLoading(false));
  }, [open]);

  const selected = templates.find((t) => t.id === selectedId);

  async function handleDelete(e: React.MouseEvent, tmplId: string) {
    e.stopPropagation();
    setDeleting(tmplId);
    await fetch("/api/templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: tmplId }),
    });
    setTemplates((prev) => prev.filter((t) => t.id !== tmplId));
    if (selectedId === tmplId) onSelect(null);
    setDeleting(null);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <LayoutTemplate className="h-4 w-4" />
        {selected
          ? `Template: ${selected.templateName}`
          : "Start from a template (optional)"}
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {loading && (
            <p className="text-sm text-muted-foreground px-4 py-3">Loading templates…</p>
          )}

          {!loading && templates.length === 0 && (
            <p className="text-sm text-muted-foreground px-4 py-3">
              No templates yet. Save a project as a template to reuse it.
            </p>
          )}

          {!loading && templates.length > 0 && (
            <div className="divide-y divide-border">
              {/* None option */}
              <button
                type="button"
                onClick={() => { onSelect(null); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors",
                  !selectedId && "bg-accent/30"
                )}
              >
                <div className="h-8 w-8 rounded-lg border border-dashed border-border flex items-center justify-center shrink-0">
                  <span className="text-xs text-muted-foreground">—</span>
                </div>
                <span className="text-sm text-muted-foreground">Blank project</span>
                {!selectedId && <Check className="h-4 w-4 text-violet-500 ml-auto" />}
              </button>

              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { onSelect(t.id); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors group",
                    selectedId === t.id && "bg-accent/30"
                  )}
                >
                  <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                    <LayoutTemplate className="h-4 w-4 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.templateName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t._count.todoSections} section{t._count.todoSections !== 1 ? "s" : ""} · {t._count.todoItems} task{t._count.todoItems !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {selectedId === t.id && <Check className="h-4 w-4 text-violet-500 shrink-0" />}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, t.id)}
                    disabled={deleting === t.id}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                    title="Delete template"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

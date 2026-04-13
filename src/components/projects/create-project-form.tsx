"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TemplatePicker } from "@/components/projects/template-picker";
import { ArrowRight, Loader2, Check } from "lucide-react";

const PROJECT_COLORS = [
  { name: "blue",   hex: "#3b82f6", label: "Blue"   },
  { name: "green",  hex: "#22c55e", label: "Green"  },
  { name: "purple", hex: "#a855f7", label: "Purple" },
  { name: "orange", hex: "#f97316", label: "Orange" },
  { name: "red",    hex: "#ef4444", label: "Red"    },
  { name: "teal",   hex: "#14b8a6", label: "Teal"   },
  { name: "pink",   hex: "#ec4899", label: "Pink"   },
  { name: "yellow", hex: "#eab308", label: "Yellow" },
];

export function CreateProjectForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [color, setColor] = useState("blue");

  const [fields, setFields] = useState({
    name: "",
    description: "",
    clientName: "",
    clientEmail: "",
    deadline: "",
    budgetUsd: "",
  });

  function set(key: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fields.name.trim()) {
      setError("Project name is required.");
      return;
    }

    setIsLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: fields.name.trim(),
        color,
      };
      if (fields.description.trim()) body.description = fields.description.trim();
      if (fields.clientName.trim()) body.clientName = fields.clientName.trim();
      if (fields.clientEmail.trim()) body.clientEmail = fields.clientEmail.trim();
      if (fields.deadline) body.deadline = fields.deadline;
      if (fields.budgetUsd) body.budgetUsd = parseFloat(fields.budgetUsd);
      if (templateId) body.templateId = templateId;

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      router.push(`/dashboard/projects/${data.project.id}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Project info */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">
          Project Info
        </h2>

        <div className="space-y-2">
          <Label htmlFor="name">Project name *</Label>
          <Input
            id="name"
            placeholder="Website Redesign"
            value={fields.name}
            onChange={(e) => set("name", e.target.value)}
            disabled={isLoading}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Brief overview of the project scope..."
            value={fields.description}
            onChange={(e) => set("description", e.target.value)}
            disabled={isLoading}
            rows={3}
          />
        </div>

        {/* Color picker */}
        <div className="space-y-2">
          <Label>Project color</Label>
          <div className="flex items-center gap-2 flex-wrap">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(c.name)}
                title={c.label}
                className="relative h-8 w-8 rounded-full border-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                style={{
                  backgroundColor: c.hex,
                  borderColor: color === c.name ? c.hex : "transparent",
                  boxShadow: color === c.name ? `0 0 0 3px white, 0 0 0 5px ${c.hex}` : undefined,
                }}
              >
                {color === c.name && (
                  <Check className="h-4 w-4 text-white absolute inset-0 m-auto" strokeWidth={2.5} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Template picker */}
      <TemplatePicker selectedId={templateId} onSelect={setTemplateId} />

      {/* Client */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">
          Client (optional)
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client name</Label>
            <Input
              id="clientName"
              placeholder="Acme Corp"
              value={fields.clientName}
              onChange={(e) => set("clientName", e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientEmail">Client email</Label>
            <Input
              id="clientEmail"
              type="email"
              placeholder="client@acme.com"
              value={fields.clientEmail}
              onChange={(e) => set("clientEmail", e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Timeline + Budget */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">
          Timeline & Budget (optional)
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={fields.deadline}
              onChange={(e) => set("deadline", e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">Budget (USD)</Label>
            <Input
              id="budget"
              type="number"
              min="0"
              step="100"
              placeholder="5000"
              value={fields.budgetUsd}
              onChange={(e) => set("budgetUsd", e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isLoading || !fields.name.trim()}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          Create Project
        </Button>
      </div>
    </form>
  );
}

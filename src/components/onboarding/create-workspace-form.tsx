"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2 } from "lucide-react";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) {
      setSlug(toSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlug(toSlug(value));
    setSlugEdited(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || name.trim().length < 2) {
      setError("Workspace name must be at least 2 characters.");
      return;
    }
    if (!slug || slug.length < 2) {
      setError("URL slug must be at least 2 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      // Force session refresh so JWT picks up new workspace
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-card p-6 shadow-sm space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Workspace name</Label>
        <Input
          id="name"
          placeholder="My Agency"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          disabled={isLoading}
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          This is your agency or team&apos;s name.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Workspace URL</Label>
        <div className="flex items-center rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
          <span className="px-3 text-sm text-muted-foreground border-r border-input bg-muted select-none whitespace-nowrap">
            teamflow.app/
          </span>
          <input
            id="slug"
            className="flex-1 px-3 py-2 text-sm bg-transparent outline-none disabled:opacity-50"
            placeholder="my-agency"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Lowercase letters, numbers, and hyphens only.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      <Button
        type="submit"
        className="w-full gap-2"
        disabled={isLoading || !name.trim() || !slug}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="h-4 w-4" />
        )}
        Create Workspace
      </Button>
    </form>
  );
}

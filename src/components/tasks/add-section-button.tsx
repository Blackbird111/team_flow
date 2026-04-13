"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface AddSectionButtonProps {
  projectId: string;
  onRefresh: () => void;
}

export function AddSectionButton({ projectId, onRefresh }: AddSectionButtonProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setIsLoading(true);
    try {
      await fetch(`/api/projects/${projectId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      setTitle("");
      setEditing(false);
      onRefresh();
    } finally {
      setIsLoading(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          placeholder="Section name..."
          disabled={isLoading}
          className="flex-1 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-300 text-slate-800"
        />
        <Button type="submit" size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading || !title.trim()}>
          Add
        </Button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-sm text-slate-400 hover:text-slate-700 transition-colors"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors py-2.5 rounded-lg border border-dashed border-slate-300 hover:border-slate-400"
    >
      <Plus className="h-4 w-4" />
      Add section
    </button>
  );
}

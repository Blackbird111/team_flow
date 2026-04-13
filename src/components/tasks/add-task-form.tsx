"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProjectMemberWithMember } from "@/components/tasks/types";

interface AddTaskFormProps {
  projectId: string;
  sectionId: string | null;
  projectMembers: ProjectMemberWithMember[];
  currentWsMemberId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddTaskForm({
  projectId,
  sectionId,
  projectMembers,
  currentWsMemberId,
  onSuccess,
  onCancel,
}: AddTaskFormProps) {
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function toggleAssignee(memberId: string) {
    setSelectedIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          description: description.trim() || undefined,
          sectionId: sectionId ?? null,
          assigneeIds: selectedIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add task");
        return;
      }
      onSuccess();
    } catch {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-blue-200 bg-white p-3 space-y-2.5 shadow-sm"
    >
      {/* Title */}
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); }
        }}
        placeholder="Task title..."
        disabled={isLoading}
        className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400 placeholder:font-normal text-slate-900"
      />

      {/* Description */}
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
        placeholder="Description (optional)"
        disabled={isLoading}
        className="w-full bg-transparent text-xs outline-none placeholder:text-slate-300 text-slate-500"
      />

      {/* Assignee picker */}
      {projectMembers.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-xs text-slate-400">Assign:</span>
          {projectMembers.map(({ workspaceMember }) => {
            const selected = selectedIds.includes(workspaceMember.id);
            const isYou = currentWsMemberId === workspaceMember.id;
            return (
              <button
                key={workspaceMember.id}
                type="button"
                onClick={() => toggleAssignee(workspaceMember.id)}
                className={cn(
                  "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors",
                  selected
                    ? "bg-blue-50 border-blue-400 text-blue-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-400"
                )}
              >
                <span className="h-3.5 w-3.5 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-700">
                  {workspaceMember.name.charAt(0).toUpperCase()}
                </span>
                {workspaceMember.name.split(" ")[0]}
                {isYou && <span className="text-[10px] text-blue-500 font-medium ml-0.5">You</span>}
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-0.5">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
          disabled={isLoading}
        >
          Cancel
        </button>
        <Button
          type="submit"
          size="sm"
          className="h-7 text-xs px-3 bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isLoading || !text.trim()}
        >
          Add task
        </Button>
      </div>
    </form>
  );
}

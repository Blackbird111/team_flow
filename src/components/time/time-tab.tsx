"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Plus, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimeLogEntry {
  id: string;
  minutes: number;
  description: string | null;
  loggedAt: Date | string;
  workspaceMember: { id: string; name: string; avatarUrl: string | null };
  todoItem: { id: string; text: string } | null;
}

interface MemberTotal {
  id: string;
  name: string;
  minutes: number;
}

interface ProjectMember {
  id: string;
  workspaceMember: { id: string; name: string };
}

interface TodoItem {
  id: string;
  text: string;
}

interface TimeTabProps {
  projectId: string;
  logs: TimeLogEntry[];
  totals: MemberTotal[];
  projectMembers: ProjectMember[];
  todoItems: TodoItem[];
  currentWsMemberId: string;
  canManage: boolean;
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDate(d: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric",
  }).format(new Date(d));
}

export function TimeTab({
  projectId,
  logs,
  totals,
  projectMembers,
  todoItems,
  currentWsMemberId,
  canManage,
}: TimeTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  const totalMinutes = totals.reduce((s, t) => s + t.minutes, 0);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleDelete(logId: string) {
    await fetch(`/api/projects/${projectId}/time-logs/${logId}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Total logged</p>
          <p className="text-2xl font-bold">{formatMinutes(totalMinutes)}</p>
        </div>
        {totals.slice(0, 2).map((t) => (
          <div key={t.id} className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground mb-1 truncate">{t.name}</p>
            <p className="text-2xl font-bold">{formatMinutes(t.minutes)}</p>
          </div>
        ))}
      </div>

      {/* Per-member breakdown (if more than 2 members) */}
      {totals.length > 2 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-sm font-semibold">By member</p>
          </div>
          <div className="divide-y divide-border">
            {totals.map((t) => {
              const pct = totalMinutes > 0 ? (t.minutes / totalMinutes) * 100 : 0;
              return (
                <div key={t.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="h-7 w-7 rounded-full bg-violet-400/20 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300 shrink-0">
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium truncate">{t.name}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{formatMinutes(t.minutes)}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Log time button + form */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Time log</p>
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          Log time
        </Button>
      </div>

      {showForm && (
        <LogTimeForm
          projectId={projectId}
          todoItems={todoItems}
          onSuccess={() => { setShowForm(false); refresh(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Log table */}
      {logs.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-14 text-center">
          <Clock className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No time logged yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Log your first entry above.
          </p>
        </div>
      ) : logs.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {logs.map((log) => {
              const isOwn = log.workspaceMember.id === currentWsMemberId;
              return (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3 group">
                  {/* Avatar */}
                  <div className="h-7 w-7 rounded-full bg-violet-400/20 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300 shrink-0 mt-0.5">
                    {log.workspaceMember.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {log.workspaceMember.name}
                      </span>
                      <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                        {formatMinutes(log.minutes)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(log.loggedAt)}
                      </span>
                    </div>
                    {log.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{log.description}</p>
                    )}
                    {log.todoItem && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        Task: {log.todoItem.text}
                      </p>
                    )}
                  </div>

                  {/* Delete */}
                  {(isOwn || canManage) && (
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="shrink-0 p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LogTimeForm({
  projectId,
  todoItems,
  onSuccess,
  onCancel,
}: {
  projectId: string;
  todoItems: TodoItem[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [description, setDescription] = useState("");
  const [todoItemId, setTodoItemId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const totalMins = (parseInt(hours || "0") * 60) + parseInt(minutes || "0");
    if (totalMins <= 0) { setError("Enter at least 1 minute."); return; }
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/time-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minutes: totalMins,
          description: description.trim() || null,
          todoItemId: todoItemId || null,
          loggedAt: date,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to log time"); return; }
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
      className="rounded-xl border border-violet-500/30 bg-card p-5 shadow-sm space-y-4"
    >
      {/* Duration */}
      <div className="flex items-center gap-3">
        <div className="space-y-1.5 flex-1">
          <label className="text-xs text-muted-foreground">Hours</label>
          <input
            type="number" min="0" max="24" placeholder="0"
            value={hours} onChange={(e) => setHours(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5 flex-1">
          <label className="text-xs text-muted-foreground">Minutes</label>
          <input
            type="number" min="0" max="59" placeholder="0"
            value={minutes} onChange={(e) => setMinutes(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5 flex-1">
          <label className="text-xs text-muted-foreground">Date</label>
          <input
            type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Task (optional) */}
      {todoItems.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Task (optional)</label>
          <div className="relative">
            <select
              value={todoItemId}
              onChange={(e) => setTodoItemId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring pr-8"
            >
              <option value="">— no task —</option>
              {todoItems.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.text.length > 60 ? t.text.slice(0, 60) + "…" : t.text}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Note (optional)</label>
        <input
          type="text" placeholder="What did you work on?"
          value={description} onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel}
          className={cn("text-xs text-muted-foreground hover:text-foreground transition-colors", isLoading && "pointer-events-none")}>
          Cancel
        </button>
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

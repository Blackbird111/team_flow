"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, CheckCircle2, Circle, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface Todo {
  id: string;
  text: string;
  description: string | null;
  completed: boolean;
  completedAt: Date | string | null;
  createdAt: Date | string;
}

function fmtDate(d: Date | string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(d));
}

function greeting(name: string) {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${name}`;
  if (h < 18) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

export function MyTasksBoard({ initialTodos, userName }: { initialTodos: Todo[]; userName: string }) {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newText, setNewText] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);

  const open = todos.filter((t) => !t.completed);
  const done = todos.filter((t) => t.completed);

  async function addTodo() {
    if (!newText.trim() || saving) return;
    setSaving(true);
    const res = await fetch("/api/my-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText.trim(), description: newDesc.trim() || null }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos((prev) => [data.todo, ...prev]);
      setNewText("");
      setNewDesc("");
      setShowAddForm(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function toggleDone(todo: Todo) {
    const next = !todo.completed;
    setTodos((prev) =>
      prev.map((t) => t.id === todo.id ? { ...t, completed: next, completedAt: next ? new Date().toISOString() : null } : t)
    );
    await fetch(`/api/my-tasks/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: next }),
    });
    router.refresh();
  }

  async function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/my-tasks/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <Sun className="h-4 w-4" />
            <span className="text-sm font-medium">{greeting(userName)}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">My Tasks</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {open.length === 0
              ? "All done! Great work."
              : `${open.length} task${open.length !== 1 ? "s" : ""} to do`}
          </p>
        </div>
        <button
          onClick={() => { setShowAddForm(true); }}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add task
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4 space-y-3">
          <input
            autoFocus
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addTodo()}
            placeholder="Task name…"
            className="w-full text-sm font-semibold text-slate-900 placeholder:text-slate-400 border-none outline-none bg-transparent"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder="Description (optional)"
            className="w-full text-sm text-slate-500 placeholder:text-slate-400 border-none outline-none bg-transparent"
          />
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
            <button
              onClick={() => { setShowAddForm(false); setNewText(""); setNewDesc(""); }}
              className="text-xs text-slate-400 hover:text-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={addTodo}
              disabled={!newText.trim() || saving}
              className="text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg transition-colors"
            >
              {saving ? "Saving…" : "Add task"}
            </button>
          </div>
        </div>
      )}

      {/* Open tasks */}
      {open.length === 0 && !showAddForm && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-dashed border-slate-200">
          <CheckCircle2 className="h-10 w-10 text-green-400 mb-3" />
          <p className="text-base font-semibold text-slate-700">No tasks yet</p>
          <p className="text-sm text-slate-400 mt-1">Add your first task to get started.</p>
        </div>
      )}

      {open.length > 0 && (
        <div className="space-y-2">
          {open.map((todo) => (
            <TaskRow key={todo.id} todo={todo} onToggle={toggleDone} onDelete={deleteTodo} />
          ))}
        </div>
      )}

      {/* Completed section */}
      {done.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setHideCompleted((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors uppercase tracking-wide"
          >
            <span>{hideCompleted ? "▶" : "▼"}</span>
            Completed ({done.length})
          </button>

          {!hideCompleted && (
            <div className="space-y-2">
              {done.map((todo) => (
                <TaskRow key={todo.id} todo={todo} onToggle={toggleDone} onDelete={deleteTodo} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  todo,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  onToggle: (t: Todo) => void;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={cn(
        "group flex items-start gap-3 px-4 py-3 rounded-xl border transition-all duration-150",
        todo.completed
          ? "bg-slate-50 border-slate-200"
          : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm hover:-translate-y-0.5"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(todo)}
        className="mt-0.5 shrink-0 text-slate-300 hover:text-blue-500 transition-colors"
        title={todo.completed ? "Mark incomplete" : "Mark done"}
      >
        {todo.completed
          ? <CheckCircle2 className="h-5 w-5 text-green-500" />
          : <Circle className="h-5 w-5" />
        }
      </button>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-semibold leading-snug",
          todo.completed ? "text-slate-400 line-through" : "text-slate-800"
        )}>
          {todo.text}
        </p>
        {todo.description && (
          <p className={cn(
            "text-xs mt-0.5",
            todo.completed ? "text-slate-400 line-through" : "text-slate-500"
          )}>
            {todo.description}
          </p>
        )}
        <p className="text-[11px] text-slate-300 mt-1">
          {todo.completed && todo.completedAt
            ? `Done ${fmtDate(todo.completedAt)}`
            : `Added ${fmtDate(todo.createdAt)}`}
        </p>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(todo.id)}
        className={cn(
          "shrink-0 p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all",
          hovered ? "opacity-100" : "opacity-0"
        )}
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

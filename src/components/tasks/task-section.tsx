"use client";

import { useState } from "react";
import { TodoItem } from "@/components/projects/TodoItem";
import { AddTaskForm } from "@/components/tasks/add-task-form";
import { useHideCompleted } from "@/components/tasks/hide-completed-context";
import { Plus, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import type { BoardItem, ProjectMemberWithMember } from "@/components/tasks/types";

interface TaskSectionProps {
  projectId: string;
  sectionId: string | null;
  title: string | null;
  items: BoardItem[];
  projectMembers: ProjectMemberWithMember[];
  currentWsMemberId: string | null;
  canManage: boolean;
  filterMemberId: string | null;
  hasSections?: boolean; // true when named sections exist — hides Add task in unsectioned zone
  onRefresh: () => void;
  onOpenComments: (taskId: string, taskText: string) => void;
}

export function TaskSection({
  projectId,
  sectionId,
  title,
  items,
  projectMembers,
  currentWsMemberId,
  canManage,
  filterMemberId,
  hasSections = false,
  onRefresh,
  onOpenComments,
}: TaskSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const { hideCompleted } = useHideCompleted();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const completedCount = items.filter((i) => i.status === "COMPLETED").length;

  const visibleItems = items
    .filter((item) => !hideCompleted || item.status !== "COMPLETED")
    .filter((item) =>
      filterMemberId
        ? item.assignees.some((a) => a.workspaceMember.id === filterMemberId)
        : true
    );
  const isEmpty = items.length === 0;

  async function handleDeleteSection() {
    if (!sectionId) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/projects/${projectId}/sections`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId }),
    });
    setDeleting(false);
    if (!res.ok) {
      const d = await res.json();
      setDeleteError(d.error ?? "Failed to delete section");
      return;
    }
    onRefresh();
  }

  return (
    <div className="space-y-2">
      {/* Section header */}
      {title !== null && (
        <div className="flex items-center gap-2 group pt-1">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-600 uppercase tracking-wide hover:text-slate-900 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {title}
          </button>

          {/* Counter badge */}
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full tabular-nums">
            {completedCount}/{items.length}
          </span>

          {/* Divider */}
          <div className="flex-1 h-px bg-slate-200" />

          {canManage && !collapsed && (
            <button
              onClick={() => setShowAddForm(true)}
              className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Add task
            </button>
          )}

          {/* Delete section — only if empty */}
          {canManage && isEmpty && (
            <button
              onClick={handleDeleteSection}
              disabled={deleting}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
              title="Delete empty section"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {deleteError && (
        <p className="text-xs text-red-500 pl-1">{deleteError}</p>
      )}

      {/* Items */}
      {!collapsed && (
        <div className="space-y-3">
          {visibleItems.length === 0 && !showAddForm && filterMemberId === null && (
            <p className="text-xs text-slate-500 py-2 pl-1">
              {title === null ? "No tasks yet." : "No tasks in this section."}
            </p>
          )}

          {visibleItems.map((item) => (
            <TodoItem
              key={item.id}
              projectId={projectId}
              item={item}
              currentWsMemberId={currentWsMemberId}
              canManage={canManage}
              projectMembers={projectMembers}
              onRefresh={onRefresh}
              onOpenComments={onOpenComments}
            />
          ))}

          {/* Inline add form */}
          {showAddForm && (
            <AddTaskForm
              projectId={projectId}
              sectionId={sectionId}
              projectMembers={projectMembers}
              currentWsMemberId={currentWsMemberId}
              onSuccess={() => {
                setShowAddForm(false);
                onRefresh();
              }}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {/* Add task: show in named sections always; in unsectioned zone only when no sections exist */}
          {canManage && !showAddForm && (title !== null || !hasSections) && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors py-2 rounded-lg border border-dashed border-slate-300 hover:bg-blue-50/50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add task
            </button>
          )}
        </div>
      )}
    </div>
  );
}

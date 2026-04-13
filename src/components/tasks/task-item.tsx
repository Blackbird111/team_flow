"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Trash2, UserX, MessageSquare, UserPlus } from "lucide-react";
import type { BoardItem, ProjectMemberWithMember } from "@/components/tasks/types";

interface TaskItemProps {
  projectId: string;
  item: BoardItem;
  currentWsMemberId: string | null;
  canManage: boolean;
  filterMemberId: string | null;
  projectMembers: ProjectMemberWithMember[];
  onRefresh: () => void;
  onOpenComments: (taskId: string, taskText: string) => void;
}

export function TaskItem({
  projectId,
  item,
  currentWsMemberId,
  canManage,
  projectMembers,
  onRefresh,
  onOpenComments,
}: TaskItemProps) {
  const [toggling, setToggling] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const pickerRef = useRef<HTMLDivElement>(null);

  const isCompleted = item.status === "COMPLETED";
  const hasNoAssignees = item.assignees.length === 0;

  const myAssignee = item.assignees.find(
    (a) => a.workspaceMember.id === currentWsMemberId
  );
  const isAssignedToMe = !!myAssignee;
  const iMadeDone = myAssignee?.completed ?? false;
  const isGrey = !isAssignedToMe && !canManage;

  const assignedIds = new Set(item.assignees.map((a) => a.workspaceMember.id));

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    function handle(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showPicker]);

  async function handleToggleDone() {
    if (!isAssignedToMe) return;
    setToggling(true);
    await fetch(`/api/projects/${projectId}/tasks/${item.id}/toggle`, {
      method: "POST",
    });
    setToggling(false);
    onRefresh();
  }

  async function handleDelete() {
    await fetch(`/api/projects/${projectId}/tasks/${item.id}`, { method: "DELETE" });
    onRefresh();
  }

  async function handleToggleAssignee(wsMemberId: string) {
    setPendingIds((prev) => new Set(prev).add(wsMemberId));
    await fetch(`/api/projects/${projectId}/tasks/${item.id}/assignees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceMemberId: wsMemberId }),
    });
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(wsMemberId);
      return next;
    });
    onRefresh();
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors",
        isCompleted ? "opacity-50" : "",
        isGrey ? "opacity-40" : "",
        hasNoAssignees && !isCompleted ? "bg-orange-50" : "hover:bg-slate-50",
        toggling ? "opacity-60 pointer-events-none" : ""
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Round checkbox */}
      <button
        onClick={handleToggleDone}
        disabled={!isAssignedToMe || toggling}
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-all flex items-center justify-center",
          isCompleted
            ? "bg-blue-600 border-blue-600"
            : iMadeDone
              ? "bg-blue-300 border-blue-300"
              : isAssignedToMe
                ? "border-slate-300 hover:border-blue-500 cursor-pointer"
                : "border-slate-200 cursor-default"
        )}
        title={
          !isAssignedToMe ? "Not assigned to you"
            : iMadeDone ? "Mark as incomplete"
            : "Mark as done"
        }
      >
        {(isCompleted || iMadeDone) && (
          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        )}
      </button>

      {/* Text + assignee chips */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm leading-snug text-slate-800",
          isCompleted && "line-through text-slate-400"
        )}>
          {item.text}
        </p>

        {item.assignees.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {item.assignees.map((assignee) => (
              <div
                key={assignee.id}
                className={cn(
                  "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full",
                  assignee.completed
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-500"
                )}
              >
                <div className="h-3.5 w-3.5 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-700 shrink-0">
                  {assignee.workspaceMember.name.charAt(0).toUpperCase()}
                </div>
                <span>{assignee.workspaceMember.name.split(" ")[0]}</span>
                {assignee.completed && (
                  <svg viewBox="0 0 8 8" className="w-2.5 h-2.5 text-emerald-600">
                    <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5"
                      strokeLinecap="round" fill="none" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        )}

        {hasNoAssignees && !isCompleted && (
          <div className="flex items-center gap-1 mt-1 text-xs text-orange-500 font-medium">
            <UserX className="h-3 w-3" />
            No assignee — needs attention
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 shrink-0">

        {/* Assign picker — managers only */}
        {canManage && !isCompleted && (
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowPicker((v) => !v)}
              className={cn(
                "p-1 rounded transition-colors",
                showPicker
                  ? "text-blue-600 bg-blue-50"
                  : "text-slate-400 hover:text-blue-600 hover:bg-blue-50",
                !hovered && !showPicker && "opacity-0"
              )}
              title="Assign members"
            >
              <UserPlus className="h-3.5 w-3.5" />
            </button>

            {showPicker && (
              <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg min-w-[200px] overflow-hidden">
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                  Assign members
                </div>
                <div className="py-1">
                  {projectMembers.map(({ workspaceMember }) => {
                    const checked = assignedIds.has(workspaceMember.id);
                    const loading = pendingIds.has(workspaceMember.id);
                    const isYou = workspaceMember.id === currentWsMemberId;
                    return (
                      <button
                        key={workspaceMember.id}
                        onClick={() => handleToggleAssignee(workspaceMember.id)}
                        disabled={loading}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        {/* Checkbox */}
                        <div className={cn(
                          "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                          checked
                            ? "bg-blue-600 border-blue-600"
                            : "border-slate-300"
                        )}>
                          {checked && (
                            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white">
                              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor"
                                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                          )}
                        </div>
                        {/* Avatar initial */}
                        <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-700 shrink-0">
                          {workspaceMember.name.charAt(0).toUpperCase()}
                        </div>
                        {/* Name */}
                        <span className="flex-1 text-left text-sm text-slate-700 truncate">
                          {workspaceMember.name.split(" ")[0]}
                          {isYou && <span className="text-slate-400 text-xs ml-1">(you)</span>}
                        </span>
                        {loading && (
                          <div className="h-3 w-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Comments */}
        <button
          onClick={() => onOpenComments(item.id, item.text)}
          className={cn(
            "relative p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors",
            !hovered && item._count.comments === 0 && "opacity-0"
          )}
          title="Comments"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {item._count.comments > 0 && (
            <span className="absolute -top-1 -right-1 h-3.5 min-w-[0.875rem] px-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {item._count.comments > 9 ? "9+" : item._count.comments}
            </span>
          )}
        </button>

        {/* Delete */}
        {canManage && (
          <button
            onClick={handleDelete}
            className={cn(
              "p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors",
              !hovered && "opacity-0"
            )}
            title="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

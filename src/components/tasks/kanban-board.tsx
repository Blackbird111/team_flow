"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserPlus, MessageSquare, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import type { BoardItem, ProjectMemberWithMember } from "@/components/tasks/types";

const COLUMNS: { status: BoardItem["status"]; label: string; color: string; bg: string }[] = [
  { status: "OPEN",        label: "To Do",      color: "border-slate-300",  bg: "bg-slate-50"  },
  { status: "IN_PROGRESS", label: "In Progress", color: "border-blue-400",   bg: "bg-blue-50"   },
  { status: "COMPLETED",   label: "Done",        color: "border-green-400",  bg: "bg-green-50"  },
];

interface KanbanBoardProps {
  projectId: string;
  allItems: BoardItem[];
  projectMembers: ProjectMemberWithMember[];
  currentWsMemberId: string | null;
  canManage: boolean;
  onRefresh: () => void;
  onOpenComments: (taskId: string, taskText: string) => void;
}

export function KanbanBoard({
  projectId,
  allItems,
  projectMembers,
  currentWsMemberId,
  canManage,
  onRefresh,
  onOpenComments,
}: KanbanBoardProps) {
  const router = useRouter();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<BoardItem["status"] | null>(null);

  async function moveToStatus(taskId: string, status: BoardItem["status"]) {
    await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onRefresh();
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, status: BoardItem["status"]) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverColumn(status);
  }

  function handleDrop(e: React.DragEvent, status: BoardItem["status"]) {
    e.preventDefault();
    setOverColumn(null);
    if (draggingId) {
      const item = allItems.find((i) => i.id === draggingId);
      if (item && item.status !== status) {
        moveToStatus(draggingId, status);
      }
    }
    setDraggingId(null);
  }

  return (
    <div className="flex gap-4 items-start overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const items = allItems.filter((i) => i.status === col.status);
        const isOver = overColumn === col.status;
        return (
          <div
            key={col.status}
            className={cn(
              "flex flex-col rounded-xl border-2 transition-colors min-w-[260px] flex-1",
              col.bg,
              isOver ? "border-blue-400 shadow-md" : col.color
            )}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={() => setOverColumn(null)}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/60">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700">{col.label}</span>
                <span className="text-xs font-semibold text-slate-400 bg-white/80 px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 p-3 min-h-[120px]">
              {items.map((item) => (
                <KanbanCard
                  key={item.id}
                  projectId={projectId}
                  item={item}
                  projectMembers={projectMembers}
                  currentWsMemberId={currentWsMemberId}
                  canManage={canManage}
                  isDragging={draggingId === item.id}
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragEnd={() => setDraggingId(null)}
                  onRefresh={onRefresh}
                  onOpenComments={onOpenComments}
                />
              ))}

              {items.length === 0 && (
                <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
                  Drop here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  projectId,
  item,
  projectMembers,
  currentWsMemberId,
  canManage,
  isDragging,
  onDragStart,
  onDragEnd,
  onRefresh,
  onOpenComments,
}: {
  projectId: string;
  item: BoardItem;
  projectMembers: ProjectMemberWithMember[];
  currentWsMemberId: string | null;
  canManage: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onRefresh: () => void;
  onOpenComments: (taskId: string, taskText: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ top: number; right: number } | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const btnRef = useState<HTMLButtonElement | null>(null);
  const pickerRef = useState<HTMLDivElement | null>(null);

  const assignedIds = new Set(item.assignees.map((a) => a.workspaceMember.id));

  const openPicker = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPickerPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right });
    setShowPicker((v) => !v);
  }, []);

  async function handleToggleAssignee(wsMemberId: string) {
    setPendingIds((p) => new Set(p).add(wsMemberId));
    await fetch(`/api/projects/${projectId}/tasks/${item.id}/assignees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceMemberId: wsMemberId }),
    });
    setPendingIds((p) => { const n = new Set(p); n.delete(wsMemberId); return n; });
    onRefresh();
  }

  async function handleDelete() {
    await fetch(`/api/projects/${projectId}/tasks/${item.id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "bg-white rounded-lg border border-slate-200 p-3 cursor-grab active:cursor-grabbing shadow-sm transition-all",
        isDragging ? "opacity-40 scale-95" : "hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      {/* Title */}
      <p className={cn(
        "text-sm font-semibold text-slate-800 leading-snug",
        item.status === "COMPLETED" && "line-through text-slate-400"
      )}>
        {item.text}
      </p>

      {item.description && (
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
      )}

      {/* Assignee avatars */}
      {item.assignees.length > 0 && (
        <div className="flex items-center gap-1 mt-2">
          {item.assignees.map((a) => (
            <div
              key={a.id}
              className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold",
                a.completed ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
              )}
              title={a.workspaceMember.name}
            >
              {a.workspaceMember.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      )}

      {/* Footer actions */}
      <div className={cn(
        "flex items-center justify-end gap-0.5 mt-2 transition-opacity",
        hovered ? "opacity-100" : "opacity-0"
      )}>
        {canManage && item.status !== "COMPLETED" && (
          <>
            <button
              onClick={openPicker}
              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Assign"
            >
              <UserPlus className="h-3 w-3" />
            </button>
            {showPicker && pickerPos && typeof document !== "undefined" && createPortal(
              <div
                ref={(el) => { pickerRef[1](el); }}
                style={{ position: "absolute", top: pickerPos.top, right: pickerPos.right, zIndex: 9999 }}
                className="bg-white border border-slate-200 rounded-xl shadow-xl min-w-[190px] overflow-hidden"
              >
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                  Assign
                </div>
                <div className="py-1 max-h-52 overflow-y-auto">
                  {projectMembers.map(({ workspaceMember: wm }) => {
                    const checked = assignedIds.has(wm.id);
                    const loading = pendingIds.has(wm.id);
                    return (
                      <button
                        key={wm.id}
                        onClick={() => handleToggleAssignee(wm.id)}
                        disabled={loading}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-sm text-slate-700 disabled:opacity-50"
                      >
                        <div className={cn("h-4 w-4 rounded border-2 flex items-center justify-center shrink-0", checked ? "bg-blue-600 border-blue-600" : "border-slate-300")}>
                          {checked && <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/></svg>}
                        </div>
                        <span className="truncate">{wm.name.split(" ")[0]}</span>
                        {wm.id === currentWsMemberId && <span className="text-slate-400 text-xs">(you)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>,
              document.body
            )}
          </>
        )}

        <button
          onClick={() => onOpenComments(item.id, item.text)}
          className="relative p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title="Comments"
        >
          <MessageSquare className="h-3 w-3" />
          {item._count.comments > 0 && (
            <span className="absolute -top-1 -right-1 h-3 min-w-[0.75rem] px-0.5 rounded-full bg-blue-600 text-white text-[8px] font-bold flex items-center justify-center leading-none">
              {item._count.comments}
            </span>
          )}
        </button>

        {canManage && (
          <button
            onClick={handleDelete}
            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

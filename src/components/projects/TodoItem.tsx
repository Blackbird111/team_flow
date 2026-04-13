"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Trash2, MessageSquare, UserPlus, Timer, Square } from "lucide-react";

function fmtDateTime(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(d));
}

function fmtElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtDuration(createdAt: Date, completedAt: Date): string {
  const ms = new Date(completedAt).getTime() - new Date(createdAt).getTime();
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
}
import type { BoardItem, ProjectMemberWithMember } from "@/components/tasks/types";

interface TodoItemProps {
  projectId: string;
  item: BoardItem;
  currentWsMemberId: string | null;
  canManage: boolean;
  projectMembers: ProjectMemberWithMember[];
  onRefresh: () => void;
  onOpenComments: (taskId: string, taskText: string) => void;
}

// ─── Visual state helpers ────────────────────────────────────────────────────

type CardState = "no-assignee" | "active" | "completed";

function getCardState(item: BoardItem): CardState {
  if (item.status === "COMPLETED") return "completed";
  if (item.assignees.length === 0) return "no-assignee";
  return "active";
}

const CARD_STYLES: Record<CardState, {
  wrapper: string;
  wrapperHover: string;
  stripe: string;
  checkbox: string;
  title: string;
  badge: string;
}> = {
  "no-assignee": {
    wrapper:      "bg-gray-50 border border-gray-300",
    wrapperHover: "hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(156,163,175,0.45)] hover:border-gray-400",
    stripe:       "bg-gray-400",
    checkbox:     "border-gray-400 cursor-not-allowed bg-white",
    title:        "text-gray-800",
    badge:        "bg-gray-200 text-gray-600",
  },
  active: {
    wrapper:      "bg-white border border-blue-300 shadow-sm",
    wrapperHover: "hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(96,165,250,0.4)] hover:border-blue-400",
    stripe:       "bg-blue-500",
    checkbox:     "border-blue-400 hover:border-blue-600 cursor-pointer",
    title:        "text-slate-900",
    badge:        "bg-blue-100 text-blue-700",
  },
  completed: {
    wrapper:      "bg-green-50 border border-green-300",
    wrapperHover: "hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(22,163,74,0.25)] hover:border-green-400",
    stripe:       "bg-green-500",
    checkbox:     "border-green-500 bg-green-500 cursor-default",
    title:        "text-slate-500 line-through",
    badge:        "bg-green-100 text-green-700",
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function TodoItem({
  projectId,
  item,
  currentWsMemberId,
  canManage,
  projectMembers,
  onRefresh,
  onOpenComments,
}: TodoItemProps) {
  const [toggling, setToggling] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [pickerPos, setPickerPos] = useState<{ top: number; right: number } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Timer state — persisted in localStorage so it survives refresh
  const timerKey = `timer:${item.id}`;
  const [timerStart, setTimerStart] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const v = localStorage.getItem(timerKey);
    return v ? parseInt(v) : null;
  });
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Tick every second while running
  useEffect(() => {
    if (timerStart) {
      const tick = () => setElapsed(Math.floor((Date.now() - timerStart) / 1000));
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerStart]);

  function startTimer() {
    const now = Date.now();
    localStorage.setItem(timerKey, String(now));
    setTimerStart(now);
  }

  async function stopTimer() {
    if (!timerStart) return;
    const minutes = Math.max(1, Math.round((Date.now() - timerStart) / 60_000));
    localStorage.removeItem(timerKey);
    setTimerStart(null);
    // Save to time log
    await fetch(`/api/projects/${projectId}/time-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes, todoItemId: item.id }),
    });
    onRefresh();
  }

  const state = getCardState(item);
  const styles = CARD_STYLES[state];

  const myAssignee = item.assignees.find((a) => a.workspaceMember.id === currentWsMemberId);
  const isAssignedToMe = !!myAssignee;
  const iMadeDone = myAssignee?.completed ?? false;

  const doneCount = item.assignees.filter((a) => a.completed).length;
  const totalCount = item.assignees.length;
  const isPartial = state === "active" && totalCount > 0 && doneCount > 0;
  const assignedIds = new Set(item.assignees.map((a) => a.workspaceMember.id));

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    function handle(e: MouseEvent) {
      const target = e.target as Node;
      if (
        pickerRef.current && !pickerRef.current.contains(target) &&
        btnRef.current && !btnRef.current.contains(target)
      ) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showPicker]);

  const openPicker = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPickerPos({
      top: rect.bottom + window.scrollY + 4,
      right: window.innerWidth - rect.right,
    });
    setShowPicker((v) => !v);
  }, []);

  async function handleToggleDone() {
    if (!isAssignedToMe || state === "no-assignee") return;
    setToggling(true);
    await fetch(`/api/projects/${projectId}/tasks/${item.id}/toggle`, { method: "POST" });
    setToggling(false);
    onRefresh();
  }

  async function handleDelete() {
    await fetch(`/api/projects/${projectId}/tasks/${item.id}`, { method: "DELETE" });
    onRefresh();
  }

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

  // Badge label
  let badgeLabel: string;
  if (state === "completed") {
    badgeLabel = "Done";
  } else if (state === "no-assignee") {
    badgeLabel = "No assignee";
  } else if (totalCount === 1) {
    badgeLabel = item.assignees[0].workspaceMember.name.split(" ")[0];
  } else {
    badgeLabel = `${totalCount} members`;
  }

  return (
    <div
      className={cn(
        "relative flex items-stretch rounded-lg transition-all duration-150 cursor-default",
        styles.wrapper,
        styles.wrapperHover,
        toggling && "opacity-60 pointer-events-none"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left color stripe */}
      <div className={cn("w-1 shrink-0 rounded-l-lg", styles.stripe)} />

      {/* Main content */}
      <div className="flex items-center gap-3 flex-1 min-w-0 px-3 py-3">

        {/* Checkbox */}
        <button
          onClick={handleToggleDone}
          disabled={!isAssignedToMe || state === "no-assignee" || toggling}
          className={cn(
            "h-[22px] w-[22px] shrink-0 rounded-full border-2 flex items-center justify-center transition-all",
            styles.checkbox,
            // partial: my check is pending — show half-filled
            isAssignedToMe && iMadeDone && state === "active" && "bg-blue-400 border-blue-400"
          )}
          title={
            state === "no-assignee" ? "No assignee"
              : !isAssignedToMe ? "Not assigned to you"
              : iMadeDone ? "Mark as incomplete"
              : "Mark as done"
          }
        >
          {/* Green checkmark for completed */}
          {state === "completed" && (
            <svg viewBox="0 0 10 10" className="w-3 h-3 text-white">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          )}
          {/* Blue checkmark for "I marked done but waiting others" */}
          {state === "active" && iMadeDone && (
            <svg viewBox="0 0 10 10" className="w-3 h-3 text-white">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          )}
        </button>

        {/* Text block */}
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold leading-snug", styles.title)}>
            {item.text}
          </p>

          {item.description && (
            <p className={cn(
              "text-xs mt-0.5 leading-snug",
              state === "completed" ? "text-slate-400 line-through" : "text-slate-500"
            )}>
              {item.description}
            </p>
          )}

          {/* Timestamps */}
          {state !== "completed" ? (
            <p className="text-xs text-slate-400 mt-1">
              Created {fmtDateTime(item.createdAt)}
            </p>
          ) : item.completedAt ? (
            <p className="text-xs text-green-600 mt-1 font-medium">
              Done {fmtDateTime(item.completedAt)}
              {" · "}
              <span className="text-slate-500 font-normal">{fmtDuration(item.createdAt, item.completedAt)}</span>
            </p>
          ) : null}

          {/* Partial completion progress */}
          {isPartial && (
            <p className="text-xs text-slate-500 mt-0.5">{doneCount} of {totalCount} completed</p>
          )}

          {/* Assignee progress chips */}
          {totalCount > 0 && state !== "completed" && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {item.assignees.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full",
                    a.completed
                      ? "bg-emerald-100 text-emerald-700 font-medium"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  )}
                >
                  {a.completed ? (
                    <svg viewBox="0 0 8 8" className="w-2.5 h-2.5 text-emerald-600 shrink-0">
                      <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round" fill="none" />
                    </svg>
                  ) : (
                    <div className="h-2.5 w-2.5 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span>{a.workspaceMember.name.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right badge */}
        <div className="shrink-0 flex items-center gap-1.5">
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
            styles.badge
          )}>
            {badgeLabel}
          </span>
        </div>
      </div>

      {/* Hover actions (right edge) — always visible for no-assignee so manager can fix it */}
      <div className={cn(
        "flex items-center gap-0.5 pr-2 transition-opacity",
        hovered || state === "no-assignee" ? "opacity-100" : "opacity-0"
      )}>
        {/* Assign picker — manager only */}
        {canManage && state !== "completed" && (
          <>
            <button
              ref={btnRef}
              onClick={openPicker}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                showPicker
                  ? "text-blue-600 bg-blue-100"
                  : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
              )}
              title="Assign members"
            >
              <UserPlus className="h-3.5 w-3.5" />
            </button>

            {showPicker && pickerPos && typeof document !== "undefined" && createPortal(
              <div
                ref={pickerRef}
                style={{ position: "absolute", top: pickerPos.top, right: pickerPos.right, zIndex: 9999 }}
                className="bg-white border border-slate-200 rounded-xl shadow-xl min-w-[200px] overflow-hidden"
              >
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                  Assign members
                </div>
                <div className="py-1 max-h-60 overflow-y-auto">
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
                        <div className={cn(
                          "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                          checked ? "bg-blue-600 border-blue-600" : "border-slate-300"
                        )}>
                          {checked && (
                            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white">
                              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor"
                                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                          )}
                        </div>
                        <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-700 shrink-0">
                          {workspaceMember.name.charAt(0).toUpperCase()}
                        </div>
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
              </div>,
              document.body
            )}
          </>
        )}

        {/* Timer */}
        {state !== "completed" && (
          timerStart ? (
            <button
              onClick={stopTimer}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors text-xs font-mono font-semibold"
              title="Stop timer"
            >
              <Square className="h-3 w-3 fill-red-500" />
              {fmtElapsed(elapsed)}
            </button>
          ) : (
            <button
              onClick={startTimer}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                hovered ? "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" : "text-transparent"
              )}
              title="Start timer"
            >
              <Timer className="h-3.5 w-3.5" />
            </button>
          )
        )}

        {/* Comments */}
        <button
          onClick={() => onOpenComments(item.id, item.text)}
          className="relative p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

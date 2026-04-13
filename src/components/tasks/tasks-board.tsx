"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TaskSection } from "@/components/tasks/task-section";
import { AddSectionButton } from "@/components/tasks/add-section-button";
import { MemberSidebar } from "@/components/tasks/member-sidebar";
import { CommentThread } from "@/components/comments/comment-thread";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { LayoutList, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardSection, BoardItem, ProjectMemberWithMember } from "@/components/tasks/types";

interface TasksBoardProps {
  projectId: string;
  sections: (BoardSection & { todoItems: BoardItem[] })[];
  unsectionedItems: BoardItem[];
  projectMembers: ProjectMemberWithMember[];
  currentWsMemberId: string | null;
  canManage: boolean;
}

export function TasksBoard({
  projectId,
  sections: initialSections,
  unsectionedItems: initialUnsectioned,
  projectMembers,
  currentWsMemberId,
  canManage,
}: TasksBoardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [view, setView] = useState<"list" | "board">("list");

  // Active member filter (sidebar click)
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);

  // Comment thread panel
  const [openThread, setOpenThread] = useState<{ taskId: string; taskText: string } | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  function toggleFilter(memberId: string) {
    setFilterMemberId((prev) => (prev === memberId ? null : memberId));
  }

  function openComments(taskId: string, taskText: string) {
    setOpenThread({ taskId, taskText });
  }

  // All items flat (for kanban)
  const allItems = [
    ...initialSections.flatMap((s) => s.todoItems),
    ...initialUnsectioned,
  ];

  // Filtered items for kanban
  const kanbanItems = filterMemberId
    ? allItems.filter((i) => i.assignees.some((a) => a.workspaceMember.id === filterMemberId))
    : allItems;

  return (
    <div className="flex flex-col gap-4">
      {/* View toggle toolbar */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
          <button
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              view === "list"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <LayoutList className="h-3.5 w-3.5" />
            List
          </button>
          <button
            onClick={() => setView("board")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              view === "board"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Board
          </button>
        </div>
      </div>

      {view === "board" ? (
        /* ── Kanban board ── */
        <div className="flex gap-5 items-start">
          <div className="flex-1 min-w-0">
            <KanbanBoard
              projectId={projectId}
              allItems={kanbanItems}
              projectMembers={projectMembers}
              currentWsMemberId={currentWsMemberId}
              canManage={canManage}
              onRefresh={refresh}
              onOpenComments={openComments}
            />
          </div>
          <div className="w-52 shrink-0 hidden lg:block">
            <MemberSidebar
              members={projectMembers}
              filterMemberId={filterMemberId}
              onToggleFilter={toggleFilter}
            />
          </div>
        </div>
      ) : (
        /* ── List view ── */
        <div className="flex gap-5 items-start">
          <div className="flex-1 min-w-0 space-y-6">
            {/* Named sections */}
            {initialSections.map((section) => (
              <TaskSection
                key={section.id}
                projectId={projectId}
                sectionId={section.id}
                title={section.title}
                items={section.todoItems}
                projectMembers={projectMembers}
                currentWsMemberId={currentWsMemberId}
                canManage={canManage}
                filterMemberId={filterMemberId}
                onRefresh={refresh}
                onOpenComments={openComments}
              />
            ))}

            {canManage && (
              <AddSectionButton projectId={projectId} onRefresh={refresh} />
            )}

            <TaskSection
              projectId={projectId}
              sectionId={null}
              title={null}
              items={initialUnsectioned}
              projectMembers={projectMembers}
              currentWsMemberId={currentWsMemberId}
              canManage={canManage}
              filterMemberId={filterMemberId}
              hasSections={initialSections.length > 0}
              onRefresh={refresh}
              onOpenComments={openComments}
            />
          </div>

          <div className="w-52 shrink-0 hidden lg:block">
            <MemberSidebar
              members={projectMembers}
              filterMemberId={filterMemberId}
              onToggleFilter={toggleFilter}
            />
          </div>
        </div>
      )}

      {/* Comment thread slide-out */}
      {openThread && (
        <CommentThread
          projectId={projectId}
          taskId={openThread.taskId}
          taskText={openThread.taskText}
          currentWsMemberId={currentWsMemberId}
          onClose={() => setOpenThread(null)}
        />
      )}
    </div>
  );
}

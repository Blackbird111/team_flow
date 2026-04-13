"use client";

import { cn } from "@/lib/utils";
import type { ProjectMemberWithMember } from "@/components/tasks/types";

interface MemberSidebarProps {
  members: ProjectMemberWithMember[];
  filterMemberId: string | null;
  onToggleFilter: (memberId: string) => void;
}

export function MemberSidebar({
  members,
  filterMemberId,
  onToggleFilter,
}: MemberSidebarProps) {
  return (
    <div className="rounded-xl border bg-card shadow-sm p-4 space-y-3 sticky top-0">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Team
      </p>

      <div className="space-y-1">
        {members.map(({ workspaceMember, role }) => {
          const isActive = filterMemberId === workspaceMember.id;
          return (
            <button
              key={workspaceMember.id}
              onClick={() => onToggleFilter(workspaceMember.id)}
              className={cn(
                "w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                isActive
                  ? "bg-violet-500/10 ring-1 ring-violet-500/30"
                  : "hover:bg-accent"
              )}
              title={isActive ? "Clear filter" : `Filter by ${workspaceMember.name}`}
            >
              {/* Avatar */}
              <div className="h-7 w-7 rounded-full bg-violet-400/20 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300 shrink-0">
                {workspaceMember.name.charAt(0).toUpperCase()}
              </div>

              {/* Name + role */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate leading-tight">
                  {workspaceMember.name.split(" ")[0]}
                </p>
                <p className="text-[10px] text-muted-foreground capitalize leading-tight">
                  {role.toLowerCase()}
                </p>
              </div>

              {/* Active indicator */}
              {isActive && (
                <div className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {filterMemberId && (
        <button
          onClick={() => onToggleFilter(filterMemberId)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear filter
        </button>
      )}
    </div>
  );
}

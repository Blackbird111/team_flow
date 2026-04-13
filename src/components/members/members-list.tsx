"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Crown, UserCircle, ChevronDown, Plus, X, FolderOpen, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const COLOR_HEX: Record<string, string> = {
  blue:   "#3b82f6",
  green:  "#22c55e",
  purple: "#a855f7",
  orange: "#f97316",
  red:    "#ef4444",
  teal:   "#14b8a6",
  pink:   "#ec4899",
  yellow: "#eab308",
};

interface MemberProject {
  projectMemberId: string;
  projectId: string;
  name: string;
  color: string;
  status: string;
  projectRole: string;
}

interface Member {
  id: string;
  name: string;
  note: string | null;
  email: string;
  role: string;
  avatarUrl: string | null;
  userId: string | null;
  projects: MemberProject[];
}

interface Project {
  id: string;
  name: string;
  color: string;
}

interface MembersListProps {
  members: Member[];
  allProjects: Project[];
  currentUserId: string;
  isAdmin: boolean;
}

export function MembersList({ members, allProjects, currentUserId, isAdmin }: MembersListProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="divide-y divide-slate-100">
        {members.map((member, i) => (
          <MemberRow
            key={member.id}
            member={member}
            allProjects={allProjects}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            isFirst={i === 0}
            isLast={i === members.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function MemberRow({
  member,
  allProjects,
  currentUserId,
  isAdmin,
  isFirst,
  isLast,
}: {
  member: Member;
  allProjects: Project[];
  currentUserId: string;
  isAdmin: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showDropdown, setShowDropdown] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Note editing
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(member.note ?? "");
  const [savingNote, setSavingNote] = useState(false);
  const noteInputRef = useRef<HTMLInputElement>(null);

  const isMe = member.userId === currentUserId;
  const canEditNote = isAdmin || isMe;
  const memberProjectIds = new Set(member.projects.map((p) => p.projectId));
  const available = allProjects.filter((p) => !memberProjectIds.has(p.id));

  useEffect(() => {
    if (editingNote) noteInputRef.current?.focus();
  }, [editingNote]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showDropdown]);

  async function handleAddToProject(projectId: string) {
    setAdding(projectId);
    setAddError(null);
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceMemberId: member.id, role: "CONTRIBUTOR" }),
    });
    setAdding(null);
    if (!res.ok) {
      const d = await res.json();
      setAddError(d.error ?? "Failed to add to project");
      return;
    }
    setShowDropdown(false);
    startTransition(() => router.refresh());
  }

  async function handleSaveNote() {
    setSavingNote(true);
    const trimmed = noteValue.trim();
    await fetch(`/api/workspaces/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: trimmed || null }),
    });
    setSavingNote(false);
    setEditingNote(false);
    startTransition(() => router.refresh());
  }

  function handleNoteKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); handleSaveNote(); }
    if (e.key === "Escape") { setEditingNote(false); setNoteValue(member.note ?? ""); }
  }

  return (
    <div className={cn("px-5 py-4", isFirst && "rounded-t-xl", isLast && "rounded-b-xl")}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
          {member.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
          ) : (
            <UserCircle className="h-5 w-5 text-blue-400" />
          )}
        </div>

        {/* Name + note + email */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium text-slate-800">{member.name}</p>
            {member.role === "ADMIN" && (
              <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            )}
            {isMe && <span className="text-xs text-slate-400">(you)</span>}

            {/* Note — inline editable */}
            {editingNote ? (
              <form
                onSubmit={(e) => { e.preventDefault(); handleSaveNote(); }}
                className="flex items-center gap-1"
              >
                <input
                  ref={noteInputRef}
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  onKeyDown={handleNoteKeyDown}
                  maxLength={120}
                  placeholder="e.g. Frontend, Berlin"
                  disabled={savingNote}
                  className="text-xs border border-blue-300 rounded px-1.5 py-0.5 bg-white outline-none focus:ring-1 focus:ring-blue-400 text-slate-600 w-40"
                />
                <button
                  type="submit"
                  disabled={savingNote}
                  className="p-0.5 text-emerald-500 hover:text-emerald-600"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingNote(false); setNoteValue(member.note ?? ""); }}
                  className="p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </form>
            ) : (
              <div className="group/note flex items-center gap-1">
                {member.note ? (
                  <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                    {member.note}
                  </span>
                ) : null}
                {canEditNote && (
                  <button
                    onClick={() => { setNoteValue(member.note ?? ""); setEditingNote(true); }}
                    className={cn(
                      "p-0.5 rounded text-slate-300 hover:text-slate-500 transition-colors",
                      member.note ? "opacity-0 group-hover/note:opacity-100" : "opacity-0 group-hover/note:opacity-100"
                    )}
                    title={member.note ? "Edit note" : "Add note"}
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate mt-0.5">{member.email}</p>
        </div>

        {/* Role badge */}
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5",
          member.role === "ADMIN"
            ? "bg-amber-100 text-amber-700"
            : "bg-slate-100 text-slate-500"
        )}>
          {member.role.charAt(0) + member.role.slice(1).toLowerCase()}
        </span>
      </div>

      {/* Projects row */}
      <div className="mt-2.5 ml-12 flex items-center gap-1.5 flex-wrap">
        {member.projects.length === 0 && (
          <span className="text-xs text-slate-300 italic">No projects</span>
        )}

        {member.projects.map((p) => {
          const hex = COLOR_HEX[p.color] ?? COLOR_HEX.blue;
          return (
            <span
              key={p.projectMemberId}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-slate-200 text-slate-600 bg-slate-50"
            >
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: hex }} />
              {p.name}
              <span className="text-slate-400 font-medium">
                · {p.projectRole === "MANAGER" ? "Manager" : "Contributor"}
              </span>
            </span>
          );
        })}

        {/* Add to project */}
        {isAdmin && available.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => { setShowDropdown((v) => !v); setAddError(null); }}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add to project
              <ChevronDown className="h-3 w-3" />
            </button>

            {showDropdown && (
              <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[200px] py-1">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Add to project
                  </span>
                  <button onClick={() => setShowDropdown(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {available.map((project) => {
                  const hex = COLOR_HEX[project.color] ?? COLOR_HEX.blue;
                  const isAdding = adding === project.id;
                  return (
                    <button
                      key={project.id}
                      onClick={() => handleAddToProject(project.id)}
                      disabled={isAdding}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                      <span className="flex-1 text-left truncate">{project.name}</span>
                      {isAdding && (
                        <span className="text-xs text-slate-400">Adding…</span>
                      )}
                    </button>
                  );
                })}
                {addError && (
                  <p className="text-xs text-red-500 px-3 py-1.5 border-t border-slate-100">{addError}</p>
                )}
              </div>
            )}
          </div>
        )}

        {isAdmin && available.length === 0 && member.projects.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-300">
            <FolderOpen className="h-3 w-3" />
            All projects
          </span>
        )}
      </div>
    </div>
  );
}

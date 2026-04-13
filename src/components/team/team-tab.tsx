"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, UserCircle, UserMinus, ChevronDown, Pencil, Check, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface WsMember {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  hourlyRate?: number | null;
}

interface ProjectMember {
  id: string;
  role: string;
  hourlyRate?: number | null;
  workspaceMember: WsMember & { userId: string | null };
}

interface TeamTabProps {
  projectId: string;
  projectMembers: ProjectMember[];
  available: WsMember[];
  currentUserId: string;
  canManage: boolean;
}

const roleLabels: Record<string, string> = {
  MANAGER: "Manager",
  CONTRIBUTOR: "Contributor",
  CLIENT: "Client",
};

export function TeamTab({
  projectId,
  projectMembers,
  available,
  currentUserId,
  canManage,
}: TeamTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addRates, setAddRates] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [leavePending, setLeavePending] = useState(false);

  const managerCount = projectMembers.filter((m) => m.role === "MANAGER").length;
  const myPm = projectMembers.find((m) => m.workspaceMember.userId === currentUserId);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleAddMember(wsMemberId: string) {
    setAddingId(wsMemberId);
    setError(null);
    const rateStr = addRates[wsMemberId]?.trim();
    const hourlyRate = rateStr ? parseFloat(rateStr) : null;

    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceMemberId: wsMemberId,
        role: "CONTRIBUTOR",
        hourlyRate: hourlyRate && !isNaN(hourlyRate) ? hourlyRate : null,
      }),
    });
    setAddingId(null);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to add member");
      return;
    }
    setShowAddPanel(false);
    setAddRates({});
    refresh();
  }

  async function handleChangeRole(pmId: string, role: string) {
    await fetch(`/api/projects/${projectId}/members/${pmId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    refresh();
  }

  async function handleChangeRate(pmId: string, hourlyRate: number | null) {
    await fetch(`/api/projects/${projectId}/members/${pmId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hourlyRate }),
    });
    refresh();
  }

  async function handleRemove(pm: ProjectMember) {
    setRemoveError(null);
    const res = await fetch(`/api/projects/${projectId}/members/${pm.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const d = await res.json();
      setRemoveError(d.error ?? "Failed to remove member");
      return;
    }
    refresh();
  }

  async function handleLeave() {
    if (!confirm("Leave this project? Your tasks will become unassigned.")) return;
    setLeavePending(true);
    const res = await fetch(`/api/projects/${projectId}/leave`, { method: "POST" });
    setLeavePending(false);
    if (!res.ok) {
      const d = await res.json();
      setRemoveError(d.error ?? "Failed to leave project");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {projectMembers.length} member{projectMembers.length !== 1 ? "s" : ""} on this project
        </p>
        <div className="flex items-center gap-2">
          {/* Leave project — for non-managers or if there are multiple managers */}
          {myPm && (!canManage || managerCount > 1) && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-slate-500 border-slate-200 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors"
              onClick={handleLeave}
              disabled={leavePending}
            >
              <LogOut className="h-3.5 w-3.5" />
              Leave project
            </Button>
          )}
          {canManage && available.length > 0 && (
            <Button
              size="sm"
              variant={showAddPanel ? "secondary" : "default"}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setShowAddPanel((v) => !v)}
            >
              {showAddPanel ? "Cancel" : "Add Member"}
            </Button>
          )}
        </div>
      </div>

      {/* Add member panel */}
      {showAddPanel && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-slate-800">Add from workspace</p>
          {available.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              {/* Avatar */}
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                {m.name.charAt(0).toUpperCase()}
              </div>
              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{m.name}</p>
                <p className="text-xs text-slate-400 truncate">{m.email}</p>
              </div>
              {/* Hourly rate input */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={addRates[m.id] ?? ""}
                  onChange={(e) =>
                    setAddRates((prev) => ({ ...prev, [m.id]: e.target.value }))
                  }
                  placeholder={m.hourlyRate?.toString() ?? "rate"}
                  className="w-16 text-xs border border-slate-200 rounded px-1.5 py-1 bg-white outline-none focus:ring-1 focus:ring-blue-400 text-slate-700"
                />
                <span className="text-slate-400">/hr</span>
              </div>
              {/* Add button */}
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-slate-200 hover:border-blue-400 hover:text-blue-600"
                disabled={addingId === m.id}
                onClick={() => handleAddMember(m.id)}
              >
                {addingId === m.id ? "Adding…" : "Add"}
              </Button>
            </div>
          ))}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      )}

      {removeError && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {removeError}
        </p>
      )}

      {/* Member list */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {projectMembers.map((pm) => {
            const isMe = pm.workspaceMember.userId === currentUserId;
            const isMgr = pm.role === "MANAGER";
            const canRemove = canManage && !isMe && !(isMgr && managerCount <= 1);

            return (
              <div key={pm.id} className="flex items-center gap-3 px-5 py-3.5">
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 shrink-0 overflow-hidden">
                  {pm.workspaceMember.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pm.workspaceMember.avatarUrl}
                      alt={pm.workspaceMember.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserCircle className="h-5 w-5 text-blue-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {pm.workspaceMember.name}
                    </p>
                    {isMgr && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                    {isMe && <span className="text-xs text-slate-400">(you)</span>}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{pm.workspaceMember.email}</p>
                </div>

                {/* Hourly rate */}
                <RateCell
                  projectRate={pm.hourlyRate ?? null}
                  wsRate={pm.workspaceMember.hourlyRate ?? null}
                  canEdit={canManage && !isMe}
                  onSave={(rate) => handleChangeRate(pm.id, rate)}
                />

                {/* Role selector (managers only, not on self) */}
                {canManage && !isMe ? (
                  <RoleSelect
                    value={pm.role}
                    onChange={(role) => handleChangeRole(pm.id, role)}
                  />
                ) : (
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      pm.role === "MANAGER"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {roleLabels[pm.role] ?? pm.role}
                  </span>
                )}

                {/* Remove button */}
                {canManage && !isMe && (
                  <button
                    onClick={() => handleRemove(pm)}
                    disabled={!canRemove}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      canRemove
                        ? "text-slate-400 hover:text-red-500 hover:bg-red-50"
                        : "text-slate-200 cursor-not-allowed"
                    )}
                    title={
                      canRemove
                        ? "Remove from project"
                        : "Cannot remove the last manager"
                    }
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RateCell({
  projectRate,
  wsRate,
  canEdit,
  onSave,
}: {
  projectRate: number | null;
  wsRate: number | null;
  canEdit: boolean;
  onSave: (rate: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(projectRate?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const effectiveRate = projectRate ?? wsRate;
  const isOverride = projectRate !== null;

  async function handleSave() {
    const trimmed = value.trim();
    const rate = trimmed === "" ? null : parseFloat(trimmed);
    if (rate !== null && isNaN(rate)) return;
    setSaving(true);
    await onSave(rate);
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="flex items-center gap-1"
      >
        <span className="text-xs text-slate-400">$</span>
        <input
          type="number"
          min="0"
          step="5"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          disabled={saving}
          placeholder={wsRate?.toString() ?? "0"}
          className="w-16 text-xs border border-slate-200 rounded px-1.5 py-0.5 bg-white outline-none focus:ring-1 focus:ring-blue-400"
        />
        <span className="text-xs text-slate-400">/hr</span>
        <button
          type="submit"
          disabled={saving}
          className="p-0.5 text-emerald-500 hover:text-emerald-600 transition-colors"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </form>
    );
  }

  return (
    <div
      className={cn("group flex items-center gap-1 text-xs", canEdit ? "cursor-pointer" : "")}
      title={
        isOverride
          ? "Project rate (overrides workspace default)"
          : wsRate
            ? "Workspace default rate"
            : undefined
      }
    >
      {effectiveRate ? (
        <span
          className={cn(
            "text-slate-400",
            isOverride && "text-blue-600 font-medium"
          )}
        >
          ${effectiveRate.toFixed(0)}/hr
        </span>
      ) : (
        <span className="text-slate-300">—</span>
      )}
      {canEdit && (
        <button
          onClick={() => {
            setValue(projectRate?.toString() ?? "");
            setEditing(true);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-slate-600"
        >
          <Pencil className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

function RoleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none text-xs px-2.5 py-1 pr-6 rounded-full border border-slate-200 bg-white text-slate-600 cursor-pointer hover:border-slate-400 transition-colors outline-none"
      >
        <option value="MANAGER">Manager</option>
        <option value="CONTRIBUTOR">Contributor</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
    </div>
  );
}

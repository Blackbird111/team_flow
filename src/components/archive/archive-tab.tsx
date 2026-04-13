"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  Clock,
  Users,
  MessageSquare,
  Download,
  CheckSquare,
  AlertTriangle,
  RotateCcw,
  Archive,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArchiveSection = {
  id: string;
  title: string;
  items: ArchiveItem[];
};

export type ArchiveItem = {
  id: string;
  text: string;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED";
  completedAt: string | null;
  assignees: { name: string }[];
  comments: { author: string; text: string; createdAt: string }[];
  timeLogs: { memberName: string; minutes: number }[];
};

export type ArchiveMemberStat = {
  id: string;
  name: string;
  totalMinutes: number;
  completedTasks: number;
};

export type ArchiveProject = {
  id: string;
  name: string;
  clientName: string | null;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  deadline: string | null;
  budgetUsd: number | null;
  archivedAt: string | null;
  totalTasks: number;
  completedTasks: number;
  totalMinutes: number;
  spentUsd: number;
};

type Props = {
  project: ArchiveProject;
  sections: ArchiveSection[];
  unsectionedItems: ArchiveItem[];
  memberStats: ArchiveMemberStat[];
  canManage: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

const statusIcon = {
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
  IN_PROGRESS: <Circle className="h-4 w-4 text-blue-500 shrink-0" />,
  OPEN: <Circle className="h-4 w-4 text-muted-foreground shrink-0" />,
};

// ─── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({ item }: { item: ArchiveItem }) {
  const [expanded, setExpanded] = useState(false);
  const itemMinutes = item.timeLogs.reduce((s, l) => s + l.minutes, 0);

  return (
    <div className="border-b border-border last:border-0">
      <div
        className="flex items-start gap-3 py-2.5 px-1 hover:bg-muted/30 rounded cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="mt-0.5">{statusIcon[item.status]}</div>
        <span className={`flex-1 text-sm ${item.status === "COMPLETED" ? "line-through text-muted-foreground" : ""}`}>
          {item.text}
        </span>
        <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
          {item.assignees.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {item.assignees.map((a) => a.name).join(", ")}
            </span>
          )}
          {itemMinutes > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {fmtMinutes(itemMinutes)}
            </span>
          )}
          {item.comments.length > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {item.comments.length}
            </span>
          )}
          {item.completedAt && (
            <span className="hidden sm:inline">{fmtDate(item.completedAt)}</span>
          )}
        </div>
      </div>

      {expanded && (item.comments.length > 0 || item.timeLogs.length > 0) && (
        <div className="ml-7 mb-3 space-y-3">
          {item.timeLogs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Time logged</p>
              <div className="space-y-0.5">
                {item.timeLogs.map((l, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{l.memberName}</span>
                    <span className="text-muted-foreground">{fmtMinutes(l.minutes)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {item.comments.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Comments</p>
              <div className="space-y-1.5">
                {item.comments.map((c, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-medium">{c.author}</span>
                    <span className="text-muted-foreground"> · {fmtDate(c.createdAt)}</span>
                    <p className="text-foreground/80 mt-0.5">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ArchiveTab({ project, sections, unsectionedItems, memberStats, canManage }: Props) {
  const [statusLoading, setStatusLoading] = useState(false);

  const progressPct = project.totalTasks > 0
    ? Math.round((project.completedTasks / project.totalTasks) * 100)
    : 0;

  const budgetPct = project.budgetUsd && project.budgetUsd > 0
    ? Math.round((project.spentUsd / project.budgetUsd) * 100)
    : null;

  async function changeStatus(status: "ACTIVE" | "COMPLETED" | "ARCHIVED") {
    setStatusLoading(true);
    try {
      await fetch(`/api/projects/${project.id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      window.location.reload();
    } finally {
      setStatusLoading(false);
    }
  }

  function printArchive() {
    window.print();
  }

  const allItems = [
    ...unsectionedItems,
    ...sections.flatMap((s) => s.items),
  ];

  return (
    <div className="space-y-5 print:space-y-4">
      {/* Print styles injected via style tag */}
      <style>{`
        @media print {
          nav, header, [data-sidebar], [data-tab-bar],
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print\\:break-inside-avoid { break-inside: avoid; }
        }
      `}</style>

      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap no-print">
        <div>
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Archive className="h-4 w-4 text-muted-foreground" />
            Project Archive
          </h2>
          {project.archivedAt && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Archived {fmtDate(project.archivedAt)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={printArchive} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export / Print
          </Button>

          {canManage && project.status !== "ACTIVE" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => changeStatus("ACTIVE")}
              disabled={statusLoading}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reopen Project
            </Button>
          )}

          {canManage && project.status === "ACTIVE" && (
            <Button
              size="sm"
              onClick={() => changeStatus("COMPLETED")}
              disabled={statusLoading}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Mark as Completed
            </Button>
          )}

          {canManage && project.status === "COMPLETED" && (
            <Button
              size="sm"
              onClick={() => changeStatus("ARCHIVED")}
              disabled={statusLoading}
              className="gap-1.5"
            >
              <Archive className="h-3.5 w-3.5" />
              Archive
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Tasks completed</p>
          <p className="text-2xl font-bold mt-1">{project.completedTasks}</p>
          <p className="text-xs text-muted-foreground">of {project.totalTasks} total ({progressPct}%)</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Time logged</p>
          <p className="text-2xl font-bold mt-1">{fmtMinutes(project.totalMinutes)}</p>
          <p className="text-xs text-muted-foreground">{(project.totalMinutes / 60).toFixed(1)} hours total</p>
        </div>
        {project.budgetUsd !== null && (
          <>
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Budget</p>
              <p className="text-2xl font-bold mt-1">${project.budgetUsd.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">total budget</p>
            </div>
            <div className={`rounded-xl border bg-card px-4 py-3 ${
              budgetPct !== null && budgetPct > 100
                ? "border-red-500/30"
                : budgetPct !== null && budgetPct > 90
                  ? "border-amber-500/30"
                  : "border-border"
            }`}>
              <p className="text-xs text-muted-foreground">Budget spent</p>
              <p className={`text-2xl font-bold mt-1 ${
                budgetPct !== null && budgetPct > 100 ? "text-red-600" :
                budgetPct !== null && budgetPct > 90 ? "text-amber-600" : ""
              }`}>${project.spentUsd.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">{budgetPct ?? 0}% used</p>
            </div>
          </>
        )}
      </div>

      {/* Incomplete tasks warning */}
      {project.totalTasks - project.completedTasks > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 no-print">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {project.totalTasks - project.completedTasks} task{project.totalTasks - project.completedTasks !== 1 ? "s" : ""} not completed
        </div>
      )}

      {/* Member stats */}
      {memberStats.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 print:break-inside-avoid">
          <p className="text-sm font-medium mb-3">Team Summary</p>
          <div className="space-y-2">
            {memberStats.map((m) => (
              <div key={m.id} className="flex items-center gap-3 text-sm">
                <span className="flex-1 font-medium">{m.name}</span>
                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {m.completedTasks} tasks
                </span>
                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  {fmtMinutes(m.totalMinutes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium mb-4">All Tasks</p>

        {sections.map((section) => (
          <div key={section.id} className="mb-4 print:break-inside-avoid">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 px-1">
              {section.title}
            </p>
            {section.items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        ))}

        {unsectionedItems.length > 0 && (
          <div className="print:break-inside-avoid">
            {sections.length > 0 && (
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 px-1">
                Unsectioned
              </p>
            )}
            {unsectionedItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        )}

        {allItems.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No tasks in this project.</p>
        )}
      </div>

      {/* Print footer */}
      <div className="hidden print:block text-xs text-muted-foreground mt-4">
        <p>Project: {project.name}{project.clientName ? ` · Client: ${project.clientName}` : ""}</p>
        <p>Exported on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
    </div>
  );
}

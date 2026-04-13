"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date));
}
import {
  Inbox, Check, X, MessageSquare, ChevronDown,
  CheckCircle2, XCircle, HelpCircle, Clock, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ClientRequest {
  id: string;
  clientName: string;
  clientEmail: string | null;
  title: string;
  description: string | null;
  status: string;
  pmNote: string | null;
  convertedToTodoId: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

interface Section {
  id: string;
  title: string;
}

interface RequestsTabProps {
  projectId: string;
  requests: ClientRequest[];
  sections: Section[];
  canManage: boolean;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  PENDING:       { label: "Pending",       icon: Clock,        cls: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  ACCEPTED:      { label: "Accepted",      icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  DECLINED:      { label: "Declined",      icon: XCircle,      cls: "text-red-600 bg-red-500/10 border-red-500/20" },
  CLARIFICATION: { label: "Clarification", icon: HelpCircle,   cls: "text-violet-600 bg-violet-500/10 border-violet-500/20" },
};

export function RequestsTab({ projectId, requests: initial, sections, canManage }: RequestsTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [requests, setRequests] = useState(initial);
  const [expanded, setExpanded] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function action(reqId: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/projects/${projectId}/requests/${reqId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const { request } = await res.json();
      setRequests((prev) => prev.map((r) => (r.id === reqId ? { ...r, ...request } : r)));
      setExpanded(null);
      refresh();
    }
  }

  const pending = requests.filter((r) => r.status === "PENDING" || r.status === "CLARIFICATION");
  const resolved = requests.filter((r) => r.status === "ACCEPTED" || r.status === "DECLINED");

  return (
    <div className="max-w-2xl space-y-6">
      {requests.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">No client requests yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Requests submitted via the Client Portal appear here.
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Needs action ({pending.length})
          </h3>
          {pending.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              sections={sections}
              canManage={canManage}
              expanded={expanded === req.id}
              onToggle={() => setExpanded((v) => (v === req.id ? null : req.id))}
              onAction={(body) => action(req.id, body)}
            />
          ))}
        </section>
      )}

      {resolved.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Resolved ({resolved.length})
          </h3>
          {resolved.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              sections={sections}
              canManage={canManage}
              expanded={expanded === req.id}
              onToggle={() => setExpanded((v) => (v === req.id ? null : req.id))}
              onAction={(body) => action(req.id, body)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function RequestCard({
  req,
  sections,
  canManage,
  expanded,
  onToggle,
  onAction,
}: {
  req: ClientRequest;
  sections: Section[];
  canManage: boolean;
  expanded: boolean;
  onToggle: () => void;
  onAction: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [note, setNote] = useState(req.pmNote ?? "");
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const cfg = statusConfig[req.status] ?? statusConfig.PENDING;
  const StatusIcon = cfg.icon;
  const isPending = req.status === "PENDING" || req.status === "CLARIFICATION";

  async function handle(body: Record<string, unknown>) {
    setActing(true);
    await onAction(body);
    setActing(false);
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-accent/30 transition-colors"
      >
        <div className="mt-0.5 shrink-0">
          <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium", cfg.cls)}>
            <StatusIcon className="h-3 w-3" />
            {cfg.label}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{req.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {req.clientName}{req.clientEmail ? ` · ${req.clientEmail}` : ""} ·{" "}
            {timeAgo(req.createdAt)}
          </p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 mt-0.5 transition-transform", expanded && "rotate-180")} />
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          {req.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{req.description}</p>
          )}

          {req.pmNote && (
            <div className="rounded-lg bg-muted px-3 py-2.5 text-sm">
              <span className="font-medium text-xs text-muted-foreground block mb-1">PM note</span>
              {req.pmNote}
            </div>
          )}

          {canManage && isPending && (
            <div className="space-y-3 pt-1">
              {/* Accept */}
              <div className="flex items-center gap-2 flex-wrap">
                {sections.length > 0 && (
                  <select
                    value={sectionId ?? ""}
                    onChange={(e) => setSectionId(e.target.value || null)}
                    className="text-xs border border-input rounded-lg px-2.5 py-1.5 bg-background outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">No section</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                )}
                <Button
                  size="sm"
                  className="gap-1.5 h-8"
                  disabled={acting}
                  onClick={() => handle({ action: "accept", sectionId })}
                >
                  {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Accept → Create task
                </Button>
              </div>

              {/* Note + Clarification / Decline */}
              <div className="space-y-2">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional PM note…"
                  rows={2}
                  className="w-full text-sm resize-none rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8"
                    disabled={acting || !note.trim()}
                    onClick={() => handle({ action: "clarification", pmNote: note })}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Ask clarification
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 text-red-600 hover:text-red-600 border-red-500/30 hover:bg-red-500/10"
                    disabled={acting}
                    onClick={() => handle({ action: "decline", pmNote: note || undefined })}
                  >
                    <X className="h-3.5 w-3.5" />
                    Decline
                  </Button>
                </div>
              </div>
            </div>
          )}

          {req.status === "ACCEPTED" && req.convertedToTodoId && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Converted to task
            </p>
          )}
        </div>
      )}
    </div>
  );
}

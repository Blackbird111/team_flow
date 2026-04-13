"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ClipboardList,
  BarChart2,
  FileText,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  Info,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanTask = {
  text: string;
  section: string;
  assignee: string | null;
  priority: "high" | "medium" | "low";
};

type Risk = {
  level: "high" | "medium" | "low";
  title: string;
  detail: string;
};

type WorkloadItem = {
  member: string;
  status: "overloaded" | "balanced" | "underutilized";
  note: string;
};

type Analysis = {
  summary: string;
  risks: Risk[];
  workload: WorkloadItem[];
  recommendations: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const priorityColors: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const riskIcon = {
  high: <AlertTriangle className="h-4 w-4 text-red-500" />,
  medium: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  low: <Info className="h-4 w-4 text-blue-500" />,
};

const workloadColors: Record<string, string> = {
  overloaded: "text-red-600 bg-red-500/10 border-red-500/20",
  balanced: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  underutilized: "text-amber-600 bg-amber-500/10 border-amber-500/20",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="font-semibold text-base">{title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

// ─── Plan Panel ───────────────────────────────────────────────────────────────

function PlanPanel({ projectId }: { projectId: string }) {
  const [description, setDescription] = useState("");
  const [tasks, setTasks] = useState<PlanTask[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (description.trim().length < 10) return;
    setLoading(true);
    setError(null);
    setTasks(null);
    setApplied(false);
    try {
      const res = await fetch(`/api/projects/${projectId}/ai/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setTasks(data.tasks);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    if (!tasks) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/ai/plan/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setApplied(true);
      setTasks(null);
      setDescription("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setApplying(false);
    }
  }

  // Group tasks by section for display
  const grouped: Record<string, PlanTask[]> = {};
  for (const t of tasks ?? []) {
    if (!grouped[t.section]) grouped[t.section] = [];
    grouped[t.section].push(t);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <SectionHeader
        icon={<ClipboardList className="h-5 w-5" />}
        title="AI Project Plan"
        description="Describe your project and Claude will generate a structured task plan with sections, priorities, and suggested assignees."
      />

      {applied && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-4">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Plan applied! Tasks and sections have been added to your project.
        </div>
      )}

      <div className="space-y-3">
        <Textarea
          placeholder="Describe the project: what needs to be built, key milestones, team constraints… (min 10 characters)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="resize-none"
          disabled={loading}
        />
        <Button
          onClick={generate}
          disabled={loading || description.trim().length < 10}
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Generating…" : "Generate Plan"}
        </Button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      {tasks && tasks.length > 0 && (
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{tasks.length} tasks generated — review and apply:</p>
            <Button
              onClick={apply}
              disabled={applying}
              size="sm"
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            >
              {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {applying ? "Applying…" : "Apply to Project"}
            </Button>
          </div>

          {Object.entries(grouped).map(([section, sectionTasks]) => (
            <div key={section}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{section}</p>
              <div className="space-y-1.5">
                {sectionTasks.map((task, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm">{task.text}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.assignee && (
                        <span className="text-xs text-muted-foreground">{task.assignee}</span>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Analysis Panel ───────────────────────────────────────────────────────────

function AnalysisPanel({ projectId }: { projectId: string }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/ai/analysis`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setAnalysis(data.analysis);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <SectionHeader
        icon={<BarChart2 className="h-5 w-5" />}
        title="AI Project Analysis"
        description="Analyse current project health — risks, team workload, and actionable recommendations."
      />

      <Button
        onClick={run}
        disabled={loading}
        className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Analysing…" : "Run Analysis"}
      </Button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {analysis && (
        <div className="mt-5 space-y-5">
          {/* Summary */}
          <div className="rounded-lg bg-muted/50 border border-border px-4 py-3">
            <p className="text-sm font-medium mb-1">Overall Status</p>
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
          </div>

          {/* Risks */}
          {analysis.risks.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Risks</p>
              <div className="space-y-2">
                {analysis.risks.map((risk, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5">
                    <div className="mt-0.5 shrink-0">{riskIcon[risk.level]}</div>
                    <div>
                      <p className="text-sm font-medium">{risk.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{risk.detail}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`ml-auto shrink-0 text-xs ${priorityColors[risk.level]}`}
                    >
                      {risk.level}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workload */}
          {analysis.workload.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Team Workload</p>
              <div className="space-y-2">
                {analysis.workload.map((w, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{w.member}</p>
                      <p className="text-xs text-muted-foreground">{w.note}</p>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${workloadColors[w.status]}`}>
                      {w.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Recommendations</p>
              <ul className="space-y-1.5">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Report Panel ─────────────────────────────────────────────────────────────

function ReportPanel({ projectId }: { projectId: string }) {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/ai/report`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setReport(data.report);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!report) return;
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <SectionHeader
        icon={<FileText className="h-5 w-5" />}
        title="Weekly Client Report"
        description="Generate a professional weekly progress report covering the last 7 days — ready to forward to your client."
      />

      <Button
        onClick={generate}
        disabled={loading}
        className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Generating…" : "Generate Report"}
      </Button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {report && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Report Preview</p>
            <Button
              variant="outline"
              size="sm"
              onClick={copy}
              className="gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-4">
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">
              {report}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AiPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-violet-500" />
        <h2 className="font-semibold text-lg">AI Assistant</h2>
        <Badge variant="outline" className="text-xs text-violet-600 border-violet-500/30 bg-violet-500/10">
          Powered by Claude
        </Badge>
      </div>

      <PlanPanel projectId={projectId} />
      <AnalysisPanel projectId={projectId} />
      <ReportPanel projectId={projectId} />
    </div>
  );
}

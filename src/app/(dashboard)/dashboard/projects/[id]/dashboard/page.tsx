import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getProjectAccess } from "@/lib/project-auth";
import { AlertTriangle, CheckCircle2, Clock3, Users, TrendingUp, Circle } from "lucide-react";

export const runtime = "nodejs";

function fmtMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const access = await getProjectAccess(projectId, session.user.id);
  if (!access) redirect("/dashboard");

  const now = new Date();

  const [tasks, members, timeAgg, recentLogs] = await Promise.all([
    prisma.todoItem.findMany({
      where: { projectId },
      select: {
        id: true,
        text: true,
        status: true,
        completedAt: true,
        createdAt: true,
        assignees: {
          select: {
            workspaceMember: { select: { id: true, name: true } },
            completed: true,
          },
        },
      },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { workspaceMember: { select: { id: true, name: true } } },
    }),
    prisma.timeLog.aggregate({ where: { projectId }, _sum: { minutes: true } }),
    prisma.timeLog.groupBy({
      by: ["workspaceMemberId"],
      where: { projectId },
      _sum: { minutes: true },
      orderBy: { _sum: { minutes: "desc" } },
    }),
  ]);

  // Stats
  const total = tasks.length;
  const open = tasks.filter((t) => t.status === "OPEN").length;
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const done = tasks.filter((t) => t.status === "COMPLETED").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const noAssignee = tasks.filter((t) => t.assignees.length === 0 && t.status !== "COMPLETED");
  const stalled = tasks.filter((t) => {
    if (t.status === "COMPLETED") return false;
    const daysSinceCreated = (now.getTime() - new Date(t.createdAt).getTime()) / 86_400_000;
    return daysSinceCreated > 5 && t.status === "OPEN" && t.assignees.length > 0;
  });

  const totalMinutes = timeAgg._sum.minutes ?? 0;

  // Per-member workload
  const memberMap = new Map(members.map((m) => [m.workspaceMember.id, m.workspaceMember.name]));
  const memberTaskCount = new Map<string, { open: number; done: number }>();
  for (const task of tasks) {
    for (const a of task.assignees) {
      const mid = a.workspaceMember.id;
      if (!memberTaskCount.has(mid)) memberTaskCount.set(mid, { open: 0, done: 0 });
      if (task.status === "COMPLETED") memberTaskCount.get(mid)!.done++;
      else memberTaskCount.get(mid)!.open++;
    }
  }

  const timeByMember = recentLogs.map((l) => ({
    name: memberMap.get(l.workspaceMemberId) ?? "Unknown",
    minutes: l._sum.minutes ?? 0,
  }));

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total tasks" value={total} icon={<Circle className="h-5 w-5 text-slate-400" />} />
        <StatCard label="In progress" value={inProgress} icon={<TrendingUp className="h-5 w-5 text-blue-500" />} color="blue" />
        <StatCard label="Completed" value={done} icon={<CheckCircle2 className="h-5 w-5 text-green-500" />} color="green" />
        <StatCard label="Time logged" value={fmtMinutes(totalMinutes)} icon={<Clock3 className="h-5 w-5 text-violet-500" />} color="violet" />
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-slate-700">Overall progress</p>
          <span className="text-2xl font-bold text-slate-900">{pct}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center gap-6 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-300" />{open} To do</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-400" />{inProgress} In progress</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" />{done} Done</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-bold text-slate-700">Attention needed</p>
          </div>
          <div className="divide-y divide-slate-100">
            {noAssignee.length === 0 && stalled.length === 0 && (
              <div className="px-5 py-4 text-sm text-slate-400">No issues found.</div>
            )}
            {noAssignee.map((t) => (
              <div key={t.id} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-700 leading-snug">{t.text}</p>
                  <p className="text-xs text-red-500 mt-0.5">No assignee</p>
                </div>
              </div>
            ))}
            {stalled.map((t) => (
              <div key={t.id} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-700 leading-snug">{t.text}</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Open for {Math.floor((now.getTime() - new Date(t.createdAt).getTime()) / 86_400_000)}d — not started
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team workload */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-bold text-slate-700">Team workload</p>
          </div>
          <div className="divide-y divide-slate-100">
            {members.map((m) => {
              const counts = memberTaskCount.get(m.workspaceMember.id) ?? { open: 0, done: 0 };
              const memberTime = timeByMember.find((t) => t.name === m.workspaceMember.name);
              return (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                    {m.workspaceMember.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{m.workspaceMember.name}</p>
                    <p className="text-xs text-slate-400">
                      {counts.open} open · {counts.done} done
                      {memberTime ? ` · ${fmtMinutes(memberTime.minutes)}` : ""}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    counts.open === 0 ? "bg-green-100 text-green-700" :
                    counts.open > 5 ? "bg-red-100 text-red-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {counts.open === 0 ? "Free" : `${counts.open} tasks`}
                  </span>
                </div>
              );
            })}
            {members.length === 0 && (
              <div className="px-5 py-4 text-sm text-slate-400">No members yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, color = "slate",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "slate" | "blue" | "green" | "violet";
}) {
  const bg = { slate: "bg-slate-50", blue: "bg-blue-50", green: "bg-green-50", violet: "bg-violet-50" }[color];
  return (
    <div className={`rounded-xl border border-slate-200 shadow-sm p-4 ${bg}`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getProjectAccess, isManager } from "@/lib/project-auth";
import { ProjectTabBar } from "@/components/projects/project-tab-bar";
import { BudgetWidget } from "@/components/projects/budget-widget";
import { SaveAsTemplateButton } from "@/components/projects/save-as-template-button";
import { HideCompletedProvider } from "@/components/tasks/hide-completed-context";
import { HideCompletedButton } from "@/components/tasks/hide-completed-button";
import { ArrowLeft, Clock, Users } from "lucide-react";
import Link from "next/link";

export const runtime = "nodejs";

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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }).format(date);
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Look up project by ID only — workspaceId will be used for member checks
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          workspaceMember: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });
  if (!project) notFound();

  // Verify user belongs to this project's workspace and is a project member
  const access = await getProjectAccess(id, session.user.id);
  if (!access) notFound();

  const canManage = isManager(access);

  // Progress + budget in parallel
  const [todoStats, costAgg] = await Promise.all([
    prisma.todoItem.groupBy({
      by: ["status"],
      where: { projectId: id },
      _count: true,
    }),
    prisma.timeLog.aggregate({
      where: { projectId: id },
      _sum: { costUsd: true },
    }),
  ]);

  const spentUsd = costAgg._sum.costUsd ?? 0;

  const completedCount = todoStats.find((s) => s.status === "COMPLETED")?._count ?? 0;
  const totalCount = todoStats.reduce((sum, s) => sum + s._count, 0);
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const days = project.deadline ? daysUntil(project.deadline) : null;
  const colorHex = COLOR_HEX[project.color ?? "blue"] ?? COLOR_HEX.blue;

  return (
    <HideCompletedProvider>
    <div className="space-y-0">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-5 overflow-hidden">
        {/* Color accent bar */}
        <div className="h-1" style={{ backgroundColor: colorHex }} />

        <div className="px-5 pt-4 pb-0">
          {/* Back link */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            MyBoard
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: colorHex }}
                />
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  project.status === "ACTIVE"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}>
                  {project.status === "ACTIVE" ? "Active" : "Completed"}
                </span>
              </div>
              {project.clientName && (
                <p className="text-sm text-slate-500 mt-1 ml-5.5">{project.clientName}</p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <HideCompletedButton completedCount={completedCount} />
              {canManage && <SaveAsTemplateButton projectId={id} />}

              {project.deadline && (
                <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${
                  days !== null && days < 0
                    ? "bg-red-50 border-red-200 text-red-600"
                    : days !== null && days <= 7
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                }`}>
                  <Clock className="h-3.5 w-3.5" />
                  {days !== null && days < 0
                    ? `${Math.abs(days)}d overdue`
                    : days === 0 ? "Due today"
                    : `Due ${formatDate(project.deadline)}`}
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-500 font-medium">
                <Users className="h-3.5 w-3.5" />
                {project.members.length} member{project.members.length !== 1 ? "s" : ""}
              </div>

              <BudgetWidget
                projectId={id}
                budgetUsd={project.budgetUsd ? Number(project.budgetUsd) : null}
                spentUsd={spentUsd}
                canManage={canManage}
              />
            </div>
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>{completedCount} of {totalCount} tasks completed</span>
                <span className="font-semibold text-slate-700">{progressPct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%`, backgroundColor: colorHex }}
                />
              </div>
            </div>
          )}

          {/* Tab bar — flush with card bottom */}
          <ProjectTabBar projectId={id} />
        </div>
      </div>

      {/* Tab content */}
      {children}
    </div>
    </HideCompletedProvider>
  );
}

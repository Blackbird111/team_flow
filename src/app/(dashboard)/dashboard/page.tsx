import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserPrimaryWorkspace } from "@/lib/subscription";
import { FolderOpen, Plus, Clock, Users, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SubscriptionBadge } from "@/components/billing/subscription-badge";

export const runtime = "nodejs";

// Maps color name → hex for the top stripe
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
    month: "short",
    day: "numeric",
  }).format(date);
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Find ALL workspaces this user belongs to (owned + invited)
  const [ownedWorkspace, allMemberships] = await Promise.all([
    prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
      include: { subscription: true },
    }),
    prisma.workspaceMember.findMany({
      where: { userId: session.user.id },
      select: { workspaceId: true, role: true },
    }),
  ]);

  if (!ownedWorkspace && allMemberships.length === 0) redirect("/onboarding");

  const allWorkspaceIds = [...new Set(allMemberships.map((m) => m.workspaceId))];

  // Admin = owner of a workspace OR ADMIN role in any workspace
  const isAdmin =
    !!ownedWorkspace ||
    allMemberships.some((m) => m.role === "ADMIN");

  // Use the subscription/workspace object for plan badge — prefer owned, else first membership's workspace
  const workspace = ownedWorkspace ?? (await prisma.workspace.findFirst({
    where: { id: allMemberships[0]?.workspaceId },
    include: { subscription: true },
  }));
  if (!workspace) redirect("/onboarding");

  // Admins see all projects in their workspaces; members see only projects they're in
  const projectsWhere = isAdmin
    ? { workspaceId: { in: allWorkspaceIds.length > 0 ? allWorkspaceIds : [workspace.id] }, status: { not: "ARCHIVED" as const }, isTemplate: false }
    : {
        status: { not: "ARCHIVED" as const },
        isTemplate: false,
        members: { some: { workspaceMember: { userId: session.user.id } } },
      };

  const projects = await prisma.project.findMany({
    where: projectsWhere,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      clientName: true,
      status: true,
      deadline: true,
      color: true,
      createdAt: true,
      _count: {
        select: {
          todoItems: { where: { status: { not: "COMPLETED" } } },
          members: true,
        },
      },
      todoItems: { select: { status: true } },
    },
  });

  const plan = (workspace.subscription?.plan ?? "FREE").toLowerCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">MyBoard</h1>
          <p className="text-slate-500 mt-0.5 text-sm">{workspace.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <SubscriptionBadge plan={plan} />
          {isAdmin && (
            <Button asChild size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/dashboard/projects/new">
                <Plus className="h-4 w-4" />
                New Project
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 mb-4">
            <FolderOpen className="h-7 w-7 text-blue-600" />
          </div>
          {isAdmin ? (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">No projects yet</h2>
              <p className="text-sm text-slate-500 max-w-xs mb-6">
                Create your first project to start managing tasks, tracking time, and collaborating with your team.
              </p>
              <Button asChild className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/dashboard/projects/new">
                  <Plus className="h-4 w-4" />
                  Create First Project
                </Link>
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">No projects assigned</h2>
              <p className="text-sm text-slate-500 max-w-xs">
                You haven&apos;t been added to any projects yet. Ask your workspace admin to add you.
              </p>
            </>
          )}
        </div>
      )}

      {/* Project grid */}
      {projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const hex = COLOR_HEX[project.color] ?? COLOR_HEX.blue;
            const total = project.todoItems.length;
            const completed = project.todoItems.filter((i) => i.status === "COMPLETED").length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            const days = project.deadline ? daysUntil(project.deadline) : null;
            const overdue = days !== null && days < 0;
            const soon = days !== null && days >= 0 && days <= 7;

            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="group flex flex-col rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all overflow-hidden"
              >
                {/* Color stripe */}
                <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: hex }} />

                <div className="p-5 flex flex-col flex-1">
                  {/* Name + status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
                      {project.name}
                    </h3>
                    <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 ${
                      project.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {project.status === "ACTIVE" ? "Active" : "Completed"}
                    </span>
                  </div>

                  {/* Client */}
                  {project.clientName && (
                    <p className="text-sm text-slate-500 mb-3 truncate">{project.clientName}</p>
                  )}

                  {/* Progress bar */}
                  {total > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>{completed}/{total} tasks</span>
                        <span className="font-semibold text-slate-700">{pct}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: hex }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Stats footer */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-auto pt-2.5 border-t border-slate-100">
                    <span className="flex items-center gap-1.5">
                      <FolderOpen className="h-3.5 w-3.5" />
                      <span>{project._count.todoItems} open</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{project._count.members} members</span>
                    </span>
                    <span className="flex items-center gap-1.5 ml-auto text-slate-400">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(project.createdAt)}
                    </span>
                    {project.deadline && (
                      <span className={`flex items-center gap-1.5 font-semibold ${
                        overdue ? "text-red-500" : soon ? "text-amber-500" : "text-slate-500"
                      }`}>
                        <Clock className="h-3.5 w-3.5" />
                        {overdue ? `${Math.abs(days!)}d late` : formatDate(project.deadline)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}

          {/* Add project card — admins only */}
          {isAdmin && (
            <Link
              href="/dashboard/projects/new"
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white p-5 text-slate-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all min-h-[140px]"
            >
              <Plus className="h-6 w-6 mb-1.5" />
              <span className="text-sm font-medium">New Project</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

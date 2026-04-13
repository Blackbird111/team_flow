// src/app/portal/[slug]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CheckSquare, Clock, Users, Circle, CheckCircle2 } from "lucide-react";
import { ClientRequestForm } from "@/components/portal/client-request-form";

export const runtime = "nodejs";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

function daysUntil(d: Date) {
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await prisma.project.findFirst({
    where: { clientPortalSlug: slug, clientPortalEnabled: true },
    select: { name: true },
  });
  return { title: project ? `${project.name} — Client Portal` : "Client Portal" };
}

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const project = await prisma.project.findFirst({
    where: { clientPortalSlug: slug, clientPortalEnabled: true },
    include: {
      todoSections: {
        orderBy: { position: "asc" },
        include: {
          todoItems: {
            orderBy: { position: "asc" },
            select: {
              id: true, text: true, status: true,
              assignees: { select: { completed: true } },
            },
          },
        },
      },
      todoItems: {
        where: { sectionId: null },
        orderBy: { position: "asc" },
        select: {
          id: true, text: true, status: true,
          assignees: { select: { completed: true } },
        },
      },
      members: { select: { id: true } },
    },
  });

  if (!project) notFound();

  // Compute stats
  const allItems = [
    ...project.todoItems,
    ...project.todoSections.flatMap((s) => s.todoItems),
  ];
  const total = allItems.length;
  const completed = allItems.filter((i) => i.status === "COMPLETED").length;
  const inProgress = allItems.filter((i) => i.status === "IN_PROGRESS").length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const days = project.deadline ? daysUntil(project.deadline) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Client Portal</p>
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              {project.clientName && (
                <p className="text-sm text-muted-foreground mt-0.5">{project.clientName}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              {project.deadline && (
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${
                  days !== null && days < 0
                    ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                    : days !== null && days <= 7
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                      : "bg-muted border-border text-muted-foreground"
                }`}>
                  <Clock className="h-3.5 w-3.5" />
                  {days !== null && days < 0
                    ? `${Math.abs(days)}d overdue`
                    : days === 0 ? "Due today"
                    : `Due ${formatDate(project.deadline)}`}
                </span>
              )}
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-muted text-muted-foreground text-xs">
                <Users className="h-3.5 w-3.5" />
                {project.members.length} member{project.members.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Progress */}
          {total > 0 && (
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {completed} completed
                  </span>
                  {inProgress > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Circle className="h-4 w-4 text-violet-500" />
                      {inProgress} in progress
                    </span>
                  )}
                  <span className="text-muted-foreground">{total - completed - inProgress} open</span>
                </div>
                <span className="font-semibold">{progressPct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task list */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {project.description && (
          <p className="text-sm text-muted-foreground">{project.description}</p>
        )}

        {/* Unsectioned items */}
        {project.todoItems.length > 0 && (
          <TaskGroup title={null} items={project.todoItems} />
        )}

        {/* Sections */}
        {project.todoSections.map((section) => (
          <TaskGroup key={section.id} title={section.title} items={section.todoItems} />
        ))}

        {total === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <CheckSquare className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No tasks yet.</p>
          </div>
        )}

        {/* Client request form */}
        <ClientRequestForm portalSlug={slug} />

        <p className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
          Powered by TeamFlow · Read-only client view
        </p>
      </div>
    </div>
  );
}

function TaskGroup({
  title,
  items,
}: {
  title: string | null;
  items: { id: string; text: string; status: string; assignees: { completed: boolean }[] }[];
}) {
  if (items.length === 0) return null;
  const done = items.filter((i) => i.status === "COMPLETED").length;

  return (
    <div className="space-y-2">
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <span className="text-xs text-muted-foreground">{done}/{items.length}</span>
        </div>
      )}
      <div className="rounded-xl border border-border overflow-hidden">
        {items.map((item, idx) => {
          const isCompleted = item.status === "COMPLETED";
          const isInProgress = item.status === "IN_PROGRESS";
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                idx < items.length - 1 ? "border-b border-border" : ""
              } ${isCompleted ? "opacity-60" : ""}`}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : isInProgress ? (
                <Circle className="h-4 w-4 text-violet-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
              <span className={`text-sm ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                {item.text}
              </span>
              {isInProgress && (
                <span className="ml-auto text-xs text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full shrink-0">
                  In progress
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

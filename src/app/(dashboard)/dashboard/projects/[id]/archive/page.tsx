import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserPrimaryWorkspace } from "@/lib/subscription";
import { getProjectAccess, isManager } from "@/lib/project-auth";
import { ArchiveTab } from "@/components/archive/archive-tab";
import type {
  ArchiveSection,
  ArchiveItem,
  ArchiveMemberStat,
  ArchiveProject,
} from "@/components/archive/archive-tab";

export const runtime = "nodejs";

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspace = await getUserPrimaryWorkspace(session.user.id);
  if (!workspace) redirect("/onboarding");

  const access = await getProjectAccess(projectId, session.user.id);
  if (!access) redirect("/dashboard");

  const canManage = isManager(access);

  // Load everything in parallel
  const [project, sections, unsectionedRaw, timeLogs, projectMembers] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        clientName: true,
        status: true,
        deadline: true,
        budgetUsd: true,
        archivedAt: true,
      },
    }),
    prisma.todoSection.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
      include: {
        todoItems: {
          orderBy: { position: "asc" },
          include: {
            assignees: { include: { workspaceMember: { select: { name: true } } } },
            comments: {
              orderBy: { createdAt: "asc" },
              include: { author: { select: { name: true } } },
            },
            timeLogs: {
              include: { workspaceMember: { select: { name: true } } },
            },
          },
        },
      },
    }),
    prisma.todoItem.findMany({
      where: { projectId, sectionId: null },
      orderBy: { position: "asc" },
      include: {
        assignees: { include: { workspaceMember: { select: { name: true } } } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true } } },
        },
        timeLogs: {
          include: { workspaceMember: { select: { name: true } } },
        },
      },
    }),
    prisma.timeLog.findMany({
      where: { projectId },
      include: {
        workspaceMember: {
          select: {
            id: true,
            name: true,
            hourlyRate: true,
            projectMembers: {
              where: { projectId },
              select: { hourlyRate: true },
            },
          },
        },
      },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { workspaceMember: { select: { id: true, name: true } } },
    }),
  ]);

  if (!project) redirect("/dashboard");

  // Helper to map a raw item to ArchiveItem
  function mapItem(item: typeof unsectionedRaw[number]): ArchiveItem {
    return {
      id: item.id,
      text: item.text,
      status: item.status as ArchiveItem["status"],
      completedAt: item.completedAt?.toISOString() ?? null,
      assignees: item.assignees.map((a) => ({ name: a.workspaceMember.name })),
      comments: item.comments.map((c) => ({
        author: c.author.name,
        text: c.text,
        createdAt: c.createdAt.toISOString(),
      })),
      timeLogs: item.timeLogs.map((l) => ({
        memberName: l.workspaceMember.name,
        minutes: l.minutes,
      })),
    };
  }

  // Compute totals
  let totalTasks = unsectionedRaw.length;
  let completedTasks = unsectionedRaw.filter((i) => i.status === "COMPLETED").length;
  for (const s of sections) {
    totalTasks += s.todoItems.length;
    completedTasks += s.todoItems.filter((i) => i.status === "COMPLETED").length;
  }

  let totalMinutes = 0;
  let spentUsd = 0;
  for (const log of timeLogs) {
    totalMinutes += log.minutes;
    const pmRate = log.workspaceMember.projectMembers[0]?.hourlyRate;
    const wsRate = log.workspaceMember.hourlyRate;
    const rate = Number(pmRate ?? wsRate ?? 0);
    if (rate > 0) spentUsd += (log.minutes / 60) * rate;
  }

  // Member stats: time + completed tasks
  const memberMinutes: Record<string, { id: string; name: string; minutes: number }> = {};
  for (const log of timeLogs) {
    const id = log.workspaceMember.id;
    if (!memberMinutes[id]) memberMinutes[id] = { id, name: log.workspaceMember.name, minutes: 0 };
    memberMinutes[id].minutes += log.minutes;
  }

  // Completed tasks per member
  const memberCompleted: Record<string, number> = {};
  const allItems = [
    ...unsectionedRaw.filter((i) => i.status === "COMPLETED"),
    ...sections.flatMap((s) => s.todoItems.filter((i) => i.status === "COMPLETED")),
  ];
  for (const item of allItems) {
    for (const a of item.assignees) {
      // find wsMember id by name match
      const pm = projectMembers.find((m) => m.workspaceMember.name === a.workspaceMember.name);
      if (pm) {
        const id = pm.workspaceMember.id;
        memberCompleted[id] = (memberCompleted[id] ?? 0) + 1;
      }
    }
  }

  const memberStats: ArchiveMemberStat[] = projectMembers.map((pm) => ({
    id: pm.workspaceMember.id,
    name: pm.workspaceMember.name,
    totalMinutes: memberMinutes[pm.workspaceMember.id]?.minutes ?? 0,
    completedTasks: memberCompleted[pm.workspaceMember.id] ?? 0,
  }));

  const archiveProject: ArchiveProject = {
    id: project.id,
    name: project.name,
    clientName: project.clientName,
    status: project.status as ArchiveProject["status"],
    deadline: project.deadline?.toISOString() ?? null,
    budgetUsd: project.budgetUsd ? Number(project.budgetUsd) : null,
    archivedAt: project.archivedAt?.toISOString() ?? null,
    totalTasks,
    completedTasks,
    totalMinutes,
    spentUsd,
  };

  const archiveSections: ArchiveSection[] = sections.map((s) => ({
    id: s.id,
    title: s.title,
    items: s.todoItems.map(mapItem),
  }));

  const archiveUnsectioned = unsectionedRaw.map(mapItem);

  return (
    <ArchiveTab
      project={archiveProject}
      sections={archiveSections}
      unsectionedItems={archiveUnsectioned}
      memberStats={memberStats}
      canManage={canManage}
    />
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TasksBoard } from "@/components/tasks/tasks-board";
import { getProjectAccess, isManager } from "@/lib/project-auth";

export const runtime = "nodejs";

export default async function ProjectTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const access = await getProjectAccess(projectId, session.user.id);
  if (!access) redirect("/dashboard");

  const canManage = isManager(access);

  // Fetch all data for the tasks board
  const [sections, unsectionedItems, projectMembers] = await Promise.all([
    // Sections with their items
    prisma.todoSection.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
      include: {
        todoItems: {
          orderBy: { position: "asc" },
          include: {
            assignees: {
              include: {
                workspaceMember: {
                  select: { id: true, name: true, avatarUrl: true },
                },
              },
            },
            _count: { select: { comments: true } },
          },
        },
      },
    }),
    // Items not in any section
    prisma.todoItem.findMany({
      where: { projectId, sectionId: null },
      orderBy: { position: "asc" },
      include: {
        assignees: {
          include: {
            workspaceMember: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
        _count: { select: { comments: true } },
      },
    }),
    // All project members (for assigning + sidebar)
    prisma.projectMember.findMany({
      where: { projectId },
      include: {
        workspaceMember: {
          select: { id: true, name: true, avatarUrl: true, userId: true },
        },
      },
    }),
  ]);

  return (
    <TasksBoard
      projectId={projectId}
      sections={sections}
      unsectionedItems={unsectionedItems}
      projectMembers={projectMembers}
      currentWsMemberId={access.wsMember.id}
      canManage={canManage}
    />
  );
}

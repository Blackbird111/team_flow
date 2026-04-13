// src/app/api/projects/[id]/tasks/[taskId]/toggle/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess } from "@/lib/project-auth";
import { notifyTaskCompleted } from "@/lib/notifications";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; taskId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId, taskId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find this user's assignee record for the item
    const assignee = await prisma.todoAssignee.findFirst({
      where: {
        todoItemId: taskId,
        workspaceMemberId: access.wsMember.id,
      },
    });

    if (!assignee) {
      return NextResponse.json(
        { error: "You are not assigned to this task" },
        { status: 400 }
      );
    }

    const newCompleted = !assignee.completed;

    // Update this assignee's completion
    await prisma.todoAssignee.update({
      where: { id: assignee.id },
      data: {
        completed: newCompleted,
        completedAt: newCompleted ? new Date() : null,
      },
    });

    // Check if ALL assignees are now done → mark item COMPLETED
    const allAssignees = await prisma.todoAssignee.findMany({
      where: { todoItemId: taskId },
      select: { completed: true },
    });

    const allDone = allAssignees.length > 0 && allAssignees.every((a) => a.completed);
    const anyDone = allAssignees.some((a) => a.completed);

    const newStatus = allDone
      ? "COMPLETED"
      : anyDone
        ? "IN_PROGRESS"
        : "OPEN";

    const item = await prisma.todoItem.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        completedAt: allDone ? new Date() : null,
      },
      include: {
        assignees: {
          include: {
            workspaceMember: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    // Notify managers when task fully completed
    if (allDone && newCompleted) {
      const [project, managers] = await Promise.all([
        prisma.project.findUnique({ where: { id: projectId }, select: { name: true } }),
        prisma.projectMember.findMany({
          where: { projectId, role: "MANAGER" },
          select: { workspaceMemberId: true },
        }),
      ]);
      notifyTaskCompleted({
        taskText: item.text,
        projectId,
        projectName: project?.name ?? "Unknown project",
        managerIds: managers.map((m) => m.workspaceMemberId),
        completedByName: access.wsMember.name,
      });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[TASKS_TOGGLE]", error);
    return NextResponse.json({ error: "Failed to toggle task" }, { status: 500 });
  }
}

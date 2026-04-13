// POST — toggle assignee on a task (add if absent, remove if present)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess, isManager } from "@/lib/project-auth";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({ workspaceMemberId: z.string() });

type Params = { params: Promise<{ id: string; taskId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId, taskId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access || !isManager(access)) {
      return NextResponse.json({ error: "Only managers can assign tasks" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { workspaceMemberId } = parsed.data;

    // Verify the member belongs to this project
    const projectMember = await prisma.projectMember.findFirst({
      where: { projectId, workspaceMemberId },
    });
    if (!projectMember) {
      return NextResponse.json({ error: "Member not in project" }, { status: 400 });
    }

    // Toggle: check if already assigned
    const existing = await prisma.todoAssignee.findUnique({
      where: { todoItemId_workspaceMemberId: { todoItemId: taskId, workspaceMemberId } },
    });

    if (existing) {
      // Remove
      await prisma.todoAssignee.delete({ where: { id: existing.id } });

      // If all remaining assignees are done, keep status — otherwise reopen if it was completed
      const remaining = await prisma.todoAssignee.count({ where: { todoItemId: taskId } });
      if (remaining === 0) {
        // No assignees left — reset to OPEN
        await prisma.todoItem.update({
          where: { id: taskId },
          data: { status: "OPEN", completedAt: null },
        });
      }
      return NextResponse.json({ action: "removed" });
    } else {
      // Add
      await prisma.todoAssignee.create({
        data: { todoItemId: taskId, workspaceMemberId, completed: false },
      });

      // If item was COMPLETED, reopen it (new assignee hasn't done their part)
      const item = await prisma.todoItem.findUnique({
        where: { id: taskId },
        select: { status: true },
      });
      if (item?.status === "COMPLETED") {
        await prisma.todoItem.update({
          where: { id: taskId },
          data: { status: "IN_PROGRESS", completedAt: null },
        });
      }

      return NextResponse.json({ action: "added" }, { status: 201 });
    }
  } catch (error) {
    console.error("[TASK_ASSIGNEES_TOGGLE]", error);
    return NextResponse.json({ error: "Failed to update assignees" }, { status: 500 });
  }
}

// src/app/api/projects/[id]/tasks/[taskId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess, isManager } from "@/lib/project-auth";
import { z } from "zod";

export const runtime = "nodejs";

const patchSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED"]).optional(),
  sectionId: z.string().nullable().optional(),
}).partial();

type Params = { params: Promise<{ id: string; taskId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
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

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.text !== undefined) data.text = parsed.data.text;
    if (parsed.data.status !== undefined) {
      data.status = parsed.data.status;
      if (parsed.data.status === "COMPLETED") data.completedAt = new Date();
      if (parsed.data.status === "OPEN") data.completedAt = null;
    }
    if ("sectionId" in parsed.data) data.sectionId = parsed.data.sectionId;

    const item = await prisma.todoItem.update({
      where: { id: taskId },
      data,
      include: {
        assignees: {
          include: {
            workspaceMember: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[TASKS_PATCH]", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
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

    // Only managers and admins can delete tasks
    if (!isManager(access)) {
      return NextResponse.json({ error: "Only managers can delete tasks" }, { status: 403 });
    }

    await prisma.todoItem.delete({ where: { id: taskId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TASKS_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}

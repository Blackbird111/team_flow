// src/app/api/projects/[id]/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess } from "@/lib/project-auth";
import { notifyTaskAssigned } from "@/lib/notifications";
import { z } from "zod";

export const runtime = "nodejs";

const createTaskSchema = z.object({
  text: z.string().min(1, "Task text is required").max(500),
  description: z.string().max(1000).optional(),
  sectionId: z.string().nullable().optional(),
  assigneeIds: z.array(z.string()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { text, description, sectionId, assigneeIds } = parsed.data;

    // Next position within section (or unsectioned)
    const last = await prisma.todoItem.findFirst({
      where: { projectId, sectionId: sectionId ?? null },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const item = await prisma.todoItem.create({
      data: {
        projectId,
        sectionId: sectionId ?? null,
        text,
        description: description ?? null,
        position: (last?.position ?? 0) + 1,
        assignees: assigneeIds?.length
          ? {
              create: assigneeIds.map((memberId) => ({
                workspaceMemberId: memberId,
              })),
            }
          : undefined,
      },
      include: {
        assignees: {
          include: {
            workspaceMember: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
      },
    });

    // Fire-and-forget notifications to assignees
    if (assigneeIds?.length) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true },
      });
      notifyTaskAssigned({
        assigneeIds,
        taskText: text,
        projectName: project?.name ?? "Unknown project",
        projectId,
        assignedByName: access.wsMember.name,
      });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[TASKS_POST]", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

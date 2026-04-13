// src/app/api/projects/[id]/ai/plan/apply/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess, isManager } from "@/lib/project-auth";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const taskSchema = z.object({
  text: z.string().min(1),
  section: z.string(),
  assignee: z.string().nullable(),
  priority: z.string(),
});

const schema = z.object({ tasks: z.array(taskSchema) });

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access || !isManager(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid tasks" }, { status: 400 });

    const { tasks } = parsed.data;

    // Load project members for assignee matching
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: { workspaceMember: { select: { id: true, name: true } } },
    });

    // Group tasks by section
    const sectionMap = new Map<string, typeof tasks>();
    for (const task of tasks) {
      const s = task.section || "General";
      if (!sectionMap.has(s)) sectionMap.set(s, []);
      sectionMap.get(s)!.push(task);
    }

    // Get current max section position
    const lastSection = await prisma.todoSection.findFirst({
      where: { projectId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    let sectionPos = (lastSection?.position ?? 0) + 1;

    for (const [sectionTitle, sectionTasks] of sectionMap) {
      // Create section
      const section = await prisma.todoSection.create({
        data: { projectId, title: sectionTitle, position: sectionPos++ },
      });

      // Create tasks with assignees
      for (let i = 0; i < sectionTasks.length; i++) {
        const task = sectionTasks[i];

        // Fuzzy-match assignee name
        let assigneeWsMemberId: string | undefined;
        if (task.assignee) {
          const match = members.find((m) =>
            m.workspaceMember.name.toLowerCase().includes(task.assignee!.toLowerCase()) ||
            task.assignee!.toLowerCase().includes(m.workspaceMember.name.toLowerCase().split(" ")[0])
          );
          assigneeWsMemberId = match?.workspaceMember.id;
        }

        await prisma.todoItem.create({
          data: {
            projectId,
            sectionId: section.id,
            text: task.text,
            position: i + 1,
            ...(assigneeWsMemberId && {
              assignees: { create: { workspaceMemberId: assigneeWsMemberId } },
            }),
          },
        });
      }
    }

    return NextResponse.json({ success: true, sectionsCreated: sectionMap.size, tasksCreated: tasks.length });
  } catch (error) {
    console.error("[AI_PLAN_APPLY]", error);
    return NextResponse.json({ error: "Failed to apply plan" }, { status: 500 });
  }
}

// src/app/api/projects/[id]/ai/plan/route.ts
// Generate a project plan (list of tasks) from a description
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess, isManager } from "@/lib/project-auth";
import { askClaude } from "@/lib/ai";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ description: z.string().min(10).max(2000) });

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access || !isManager(access)) {
      return NextResponse.json({ error: "Only managers can use AI features" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Description required (10-2000 chars)" }, { status: 400 });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, deadline: true },
    });
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: { workspaceMember: { select: { name: true } } },
    });
    const memberNames = members.map((m) => m.workspaceMember.name).join(", ");
    const deadline = project?.deadline
      ? `Deadline: ${project.deadline.toISOString().split("T")[0]}`
      : "";

    const prompt = `You are a project management assistant. Generate a structured task plan for the following project.

Project: ${project?.name}
${deadline}
Team members: ${memberNames || "not specified"}
Description: ${parsed.data.description}

Return ONLY a JSON array of 6-10 tasks in this exact format, no other text:
[
  {
    "text": "task description",
    "section": "section name (Design|Development|Testing|Launch|or similar)",
    "assignee": "member name or null",
    "priority": "high|medium|low"
  }
]`;

    const raw = await askClaude(prompt);

    // Extract JSON array from response
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return NextResponse.json({ error: "AI returned unexpected format" }, { status: 500 });

    const tasks = JSON.parse(match[0]) as Array<{
      text: string;
      section: string;
      assignee: string | null;
      priority: string;
    }>;

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("[AI_PLAN]", error);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}

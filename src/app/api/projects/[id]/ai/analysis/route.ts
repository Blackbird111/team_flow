// src/app/api/projects/[id]/ai/analysis/route.ts
// Analyse project: risks, workload, blockers
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess, isManager } from "@/lib/project-auth";
import { askClaude } from "@/lib/ai";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access || !isManager(access)) {
      return NextResponse.json({ error: "Only managers can use AI features" }, { status: 403 });
    }

    const [project, members, items, timeLogs] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true, deadline: true, budgetUsd: true },
      }),
      prisma.projectMember.findMany({
        where: { projectId },
        include: { workspaceMember: { select: { name: true } } },
      }),
      prisma.todoItem.findMany({
        where: { projectId },
        include: { assignees: { include: { workspaceMember: { select: { name: true } } } } },
      }),
      prisma.timeLog.findMany({
        where: { projectId },
        include: { workspaceMember: { select: { name: true } } },
      }),
    ]);

    // Build context
    const totalItems = items.length;
    const completed = items.filter((i) => i.status === "COMPLETED").length;
    const inProgress = items.filter((i) => i.status === "IN_PROGRESS").length;
    const noAssignee = items.filter((i) => i.assignees.length === 0 && i.status !== "COMPLETED").length;

    // Time per member
    const timeByMember: Record<string, number> = {};
    for (const log of timeLogs) {
      const name = log.workspaceMember.name;
      timeByMember[name] = (timeByMember[name] ?? 0) + log.minutes;
    }

    // Tasks per member
    const tasksByMember: Record<string, number> = {};
    for (const item of items) {
      if (item.status === "COMPLETED") continue;
      for (const a of item.assignees) {
        const name = a.workspaceMember.name;
        tasksByMember[name] = (tasksByMember[name] ?? 0) + 1;
      }
    }

    const daysLeft = project?.deadline
      ? Math.ceil((project.deadline.getTime() - Date.now()) / 86_400_000)
      : null;

    const context = `
Project: ${project?.name}
Deadline: ${project?.deadline ? project.deadline.toISOString().split("T")[0] : "not set"}${daysLeft !== null ? ` (${daysLeft} days remaining)` : ""}
Budget: ${project?.budgetUsd ? `$${project.budgetUsd}` : "not set"}

Tasks: ${totalItems} total, ${completed} completed (${totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0}%), ${inProgress} in progress, ${noAssignee} without assignee
Team members: ${members.map((m) => m.workspaceMember.name).join(", ")}

Open tasks per member: ${Object.entries(tasksByMember).map(([n, c]) => `${n}: ${c}`).join(", ") || "none"}
Time logged per member (hours): ${Object.entries(timeByMember).map(([n, m]) => `${n}: ${(m / 60).toFixed(1)}h`).join(", ") || "none"}
`.trim();

    const prompt = `You are an experienced project manager. Analyse this project and provide concise, actionable insights.

${context}

Return ONLY a JSON object in this exact format, no other text:
{
  "summary": "2-3 sentence overall status",
  "risks": [
    { "level": "high|medium|low", "title": "risk title", "detail": "brief explanation" }
  ],
  "workload": [
    { "member": "name", "status": "overloaded|balanced|underutilized", "note": "brief note" }
  ],
  "recommendations": ["action 1", "action 2", "action 3"]
}`;

    const raw = await askClaude(prompt);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "AI returned unexpected format" }, { status: 500 });

    const analysis = JSON.parse(match[0]);
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("[AI_ANALYSIS]", error);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}

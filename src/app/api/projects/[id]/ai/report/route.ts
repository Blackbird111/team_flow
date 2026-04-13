// src/app/api/projects/[id]/ai/report/route.ts
// Generate a weekly report (Markdown) ready to forward to client
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

    // Last 7 days window
    const since = new Date(Date.now() - 7 * 86_400_000);

    const [project, completedThisWeek, inProgressNow, timeLogs, openItems] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true, clientName: true, deadline: true },
      }),
      prisma.todoItem.findMany({
        where: { projectId, status: "COMPLETED", completedAt: { gte: since } },
        select: { text: true },
      }),
      prisma.todoItem.findMany({
        where: { projectId, status: "IN_PROGRESS" },
        select: { text: true, assignees: { include: { workspaceMember: { select: { name: true } } } } },
      }),
      prisma.timeLog.findMany({
        where: { projectId, createdAt: { gte: since } },
        include: { workspaceMember: { select: { name: true } } },
      }),
      prisma.todoItem.findMany({
        where: { projectId, status: "OPEN", assignees: { none: {} } },
        select: { text: true },
        take: 5,
      }),
    ]);

    const totalMinutes = timeLogs.reduce((s, l) => s + l.minutes, 0);
    const timeByMember: Record<string, number> = {};
    for (const l of timeLogs) {
      timeByMember[l.workspaceMember.name] = (timeByMember[l.workspaceMember.name] ?? 0) + l.minutes;
    }

    const daysLeft = project?.deadline
      ? Math.ceil((project.deadline.getTime() - Date.now()) / 86_400_000)
      : null;

    const context = `
Project: ${project?.name}
Client: ${project?.clientName ?? "not specified"}
${daysLeft !== null ? `Deadline: ${project?.deadline?.toISOString().split("T")[0]} (${daysLeft} days away)` : ""}
Report week: ${since.toISOString().split("T")[0]} – ${new Date().toISOString().split("T")[0]}

Completed this week (${completedThisWeek.length}):
${completedThisWeek.map((t) => `- ${t.text}`).join("\n") || "none"}

Currently in progress (${inProgressNow.length}):
${inProgressNow.map((t) => `- ${t.text} (${t.assignees.map((a) => a.workspaceMember.name).join(", ")})`).join("\n") || "none"}

Time logged this week: ${(totalMinutes / 60).toFixed(1)} hours
${Object.entries(timeByMember).map(([n, m]) => `  ${n}: ${(m / 60).toFixed(1)}h`).join("\n")}

Blockers / unassigned tasks:
${openItems.map((t) => `- ${t.text}`).join("\n") || "none"}
`.trim();

    const prompt = `You are writing a professional weekly progress report for a client. Keep it concise, positive, and action-oriented.

${context}

Write a professional weekly report in plain text (no markdown headers, no bullet points with symbols, just clean paragraphs). Include:
1. Brief summary of the week
2. What was accomplished
3. What is in progress next week
4. Any items needing client attention (if any)
5. Time logged

Keep it under 300 words. Address it to the client professionally.`;

    const report = await askClaude(prompt);
    return NextResponse.json({ report });
  } catch (error) {
    console.error("[AI_REPORT]", error);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}

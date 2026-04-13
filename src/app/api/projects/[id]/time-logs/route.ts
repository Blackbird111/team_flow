// src/app/api/projects/[id]/time-logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess } from "@/lib/project-auth";
import { z } from "zod";

export const runtime = "nodejs";

// GET — all time logs for the project
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const logs = await prisma.timeLog.findMany({
      where: { projectId },
      orderBy: { loggedAt: "desc" },
      include: {
        workspaceMember: { select: { id: true, name: true, avatarUrl: true } },
        todoItem: { select: { id: true, text: true } },
      },
    });

    // Totals per member
    const totals: Record<string, { name: string; minutes: number }> = {};
    for (const log of logs) {
      const mid = log.workspaceMember.id;
      if (!totals[mid]) {
        totals[mid] = { name: log.workspaceMember.name, minutes: 0 };
      }
      totals[mid].minutes += log.minutes;
    }

    return NextResponse.json({ logs, totals: Object.values(totals) });
  } catch (error) {
    console.error("[TIME_LOGS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch time logs" }, { status: 500 });
  }
}

const createLogSchema = z.object({
  minutes: z.number().int().positive("Must be a positive number of minutes"),
  description: z.string().max(200).optional(),
  todoItemId: z.string().nullable().optional(),
  loggedAt: z.string().optional(), // ISO date string, defaults to today
});

// POST — log time
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
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const parsed = createLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { minutes, description, todoItemId, loggedAt } = parsed.data;

    // Calculate cost: use project-level hourly rate if set, otherwise workspace rate
    const memberRates = await prisma.projectMember.findFirst({
      where: { projectId, workspaceMemberId: access.wsMember.id },
      select: {
        hourlyRate: true,
        workspaceMember: { select: { hourlyRate: true } },
      },
    });
    const rate = Number(
      memberRates?.hourlyRate ?? memberRates?.workspaceMember.hourlyRate ?? 0
    );
    const costUsd = rate > 0 ? (minutes / 60) * rate : null;

    const log = await prisma.timeLog.create({
      data: {
        projectId,
        workspaceMemberId: access.wsMember.id,
        minutes,
        costUsd,
        description: description ?? null,
        todoItemId: todoItemId ?? null,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
      },
      include: {
        workspaceMember: { select: { id: true, name: true, avatarUrl: true } },
        todoItem: { select: { id: true, text: true } },
      },
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    console.error("[TIME_LOGS_POST]", error);
    return NextResponse.json({ error: "Failed to log time" }, { status: 500 });
  }
}

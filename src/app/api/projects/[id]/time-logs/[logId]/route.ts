// src/app/api/projects/[id]/time-logs/[logId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess, isManager } from "@/lib/project-auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; logId: string }> };

// DELETE — own log always, manager can delete any
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId, logId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const log = await prisma.timeLog.findUnique({
      where: { id: logId },
      select: { workspaceMemberId: true, projectId: true },
    });

    if (!log || log.projectId !== projectId) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const isOwn = log.workspaceMemberId === access.wsMember.id;
    if (!isOwn && !isManager(access)) {
      return NextResponse.json({ error: "You can only delete your own logs" }, { status: 403 });
    }

    await prisma.timeLog.delete({ where: { id: logId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TIME_LOG_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete log" }, { status: 500 });
  }
}

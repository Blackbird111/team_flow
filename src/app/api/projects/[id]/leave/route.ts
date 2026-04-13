// src/app/api/projects/[id]/leave/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess } from "@/lib/project-auth";

export const runtime = "nodejs";

// POST — current user leaves the project
export async function POST(
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
    if (!access) {
      return NextResponse.json({ error: "Not a project member" }, { status: 403 });
    }

    const myPm = access.projectMember;

    // Protect: sole manager cannot leave
    if (myPm.role === "MANAGER") {
      const managerCount = await prisma.projectMember.count({
        where: { projectId, role: "MANAGER" },
      });
      if (managerCount <= 1) {
        return NextResponse.json(
          { error: "You are the only manager. Assign another manager before leaving." },
          { status: 409 }
        );
      }
    }

    // Remove assignee records (tasks stay, become unassigned)
    await prisma.todoAssignee.deleteMany({
      where: {
        workspaceMemberId: access.wsMember.id,
        todoItem: { projectId },
      },
    });

    await prisma.projectMember.delete({ where: { id: myPm.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PROJECT_LEAVE]", error);
    return NextResponse.json({ error: "Failed to leave project" }, { status: 500 });
  }
}

// src/app/api/projects/[id]/members/[memberId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess, isManager } from "@/lib/project-auth";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; memberId: string }> };

const patchSchema = z.object({
  role: z.enum(["MANAGER", "CONTRIBUTOR"]).optional(),
  hourlyRate: z.number().min(0).nullable().optional(),
});

// PATCH — change project role
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId, memberId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access || !isManager(access)) {
      return NextResponse.json({ error: "Only managers can change roles" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.role !== undefined) data.role = parsed.data.role;
    if (parsed.data.hourlyRate !== undefined) data.hourlyRate = parsed.data.hourlyRate;

    const member = await prisma.projectMember.update({
      where: { id: memberId },
      data,
      include: {
        workspaceMember: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ member });
  } catch (error) {
    console.error("[PROJECT_MEMBER_PATCH]", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

// DELETE — remove member from project (their tasks stay, become unassigned)
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId, memberId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access || !isManager(access)) {
      return NextResponse.json({ error: "Only managers can remove members" }, { status: 403 });
    }

    // Get the member being removed
    const pm = await prisma.projectMember.findUnique({
      where: { id: memberId },
      select: { workspaceMemberId: true, role: true },
    });
    if (!pm) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // Protect: cannot remove the last MANAGER
    if (pm.role === "MANAGER") {
      const managerCount = await prisma.projectMember.count({
        where: { projectId, role: "MANAGER" },
      });
      if (managerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last manager. Assign another manager first." },
          { status: 409 }
        );
      }
    }

    // Remove assignee records (tasks remain, just become unassigned)
    await prisma.todoAssignee.deleteMany({
      where: {
        workspaceMemberId: pm.workspaceMemberId,
        todoItem: { projectId },
      },
    });

    await prisma.projectMember.delete({ where: { id: memberId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PROJECT_MEMBER_DELETE]", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}

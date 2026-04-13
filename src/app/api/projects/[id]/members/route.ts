// src/app/api/projects/[id]/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess, isManager } from "@/lib/project-auth";
import { z } from "zod";

export const runtime = "nodejs";

// GET — list project members + workspace members not yet in project
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

    const [projectMembers, allWsMembers] = await Promise.all([
      prisma.projectMember.findMany({
        where: { projectId },
        include: {
          workspaceMember: {
            select: { id: true, name: true, email: true, avatarUrl: true, role: true, userId: true },
          },
        },
        orderBy: { addedAt: "asc" },
      }),
      prisma.workspaceMember.findMany({
        where: { workspaceId: access.project.workspaceId },
        select: { id: true, name: true, email: true, avatarUrl: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const inProjectIds = new Set(projectMembers.map((m) => m.workspaceMemberId));
    const available = allWsMembers.filter((m) => !inProjectIds.has(m.id));

    return NextResponse.json({ projectMembers, available });
  } catch (error) {
    console.error("[PROJECT_MEMBERS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

const addMemberSchema = z.object({
  workspaceMemberId: z.string(),
  role: z.enum(["MANAGER", "CONTRIBUTOR"]).default("CONTRIBUTOR"),
  hourlyRate: z.number().min(0).nullable().optional(),
});

// POST — add workspace member to project
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
    if (!access || !isManager(access)) {
      return NextResponse.json({ error: "Only managers can add members" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { workspaceMemberId, role, hourlyRate } = parsed.data;

    // Verify member belongs to workspace
    const wsMember = await prisma.workspaceMember.findFirst({
      where: { id: workspaceMemberId, workspaceId: access.project.workspaceId },
    });
    if (!wsMember) {
      return NextResponse.json({ error: "Member not found in workspace" }, { status: 400 });
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        workspaceMemberId,
        role,
        hourlyRate: hourlyRate ?? null,
      },
      include: {
        workspaceMember: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error("[PROJECT_MEMBERS_POST]", error);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}

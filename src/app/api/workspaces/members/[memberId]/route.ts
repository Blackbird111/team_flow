import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPrimaryWorkspace } from "@/lib/subscription";
import { z } from "zod";

export const runtime = "nodejs";

const patchSchema = z.object({
  note: z.string().max(120).nullable().optional(),
});

type Params = { params: Promise<{ memberId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { memberId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await getUserPrimaryWorkspace(session.user.id);
    if (!workspace) {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    // Only admin can edit other members; any member can edit their own note
    const currentMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId: workspace.id, userId: session.user.id },
      select: { id: true, role: true },
    });
    if (!currentMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const target = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId: workspace.id },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const isAdmin = currentMember.role === "ADMIN";
    const isSelf = currentMember.id === memberId;
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { note: parsed.data.note ?? null },
      select: { id: true, note: true },
    });

    return NextResponse.json({ member: updated });
  } catch (error) {
    console.error("[WS_MEMBER_PATCH]", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

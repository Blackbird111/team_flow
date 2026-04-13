// src/app/api/workspaces/invite/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: { workspace: { select: { id: true, name: true } } },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
    }
    if (invite.acceptedAt) {
      return NextResponse.json({ error: "This invite has already been used" }, { status: 409 });
    }
    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
    }

    // Check email matches (loose — allow any logged-in user to accept)
    // But warn if different email
    const emailMismatch = invite.email.toLowerCase() !== session.user.email.toLowerCase();

    // Already a member?
    const existing = await prisma.workspaceMember.findFirst({
      where: { workspaceId: invite.workspaceId, userId: session.user.id },
    });
    if (existing) {
      // Mark invite accepted and redirect
      await prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      return NextResponse.json({ workspaceId: invite.workspaceId, alreadyMember: true });
    }

    // Accept: create WorkspaceMember + mark invite done
    await prisma.$transaction([
      prisma.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: session.user.id,
          name: session.user.name ?? session.user.email,
          email: session.user.email,
          role: invite.role,
        },
      }),
      prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      workspaceId: invite.workspaceId,
      emailMismatch,
    });
  } catch (error) {
    console.error("[INVITE_ACCEPT]", error);
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WorkspacePlan, SubStatus } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/verify-email?error=missing`);
  }

  const user = await prisma.user.findUnique({
    where: { verificationToken: token },
  });

  if (
    !user ||
    !user.verificationTokenExpiry ||
    user.verificationTokenExpiry < new Date()
  ) {
    return NextResponse.redirect(`${baseUrl}/verify-email?error=invalid`);
  }

  // Mark email as verified and clear token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      verificationToken: null,
      verificationTokenExpiry: null,
    },
  });

  // If there's a pending workspace invite for this email, accept it instead of creating a new workspace
  if (user.email) {
    const pendingInvite = await prisma.workspaceInvite.findFirst({
      where: {
        email: user.email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (pendingInvite) {
      // Check not already a member
      const alreadyMember = await prisma.workspaceMember.findFirst({
        where: { workspaceId: pendingInvite.workspaceId, userId: user.id },
      });

      if (!alreadyMember) {
        await prisma.$transaction([
          prisma.workspaceMember.create({
            data: {
              workspaceId: pendingInvite.workspaceId,
              userId: user.id,
              name: user.name ?? user.email,
              email: user.email,
              role: pendingInvite.role,
            },
          }),
          prisma.workspaceInvite.update({
            where: { id: pendingInvite.id },
            data: { acceptedAt: new Date() },
          }),
        ]);
      }

      // Redirect to My Tasks — they now have a workspace
      return NextResponse.redirect(`${baseUrl}/dashboard/my-tasks`);
    }
  }

  // No invite — create workspace + subscription (normal registration flow)
  const existing = await prisma.workspace.findFirst({
    where: { ownerId: user.id },
  });
  if (!existing) {
    const base = (user.name ?? user.email ?? user.id)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    const suffix = Math.random().toString(36).slice(2, 6);
    const slug = `${base}-${suffix}`;

    await prisma.workspace.create({
      data: {
        name: user.name ? `${user.name}'s Workspace` : "My Workspace",
        slug,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            name: user.name ?? user.email ?? "Owner",
            email: user.email ?? "",
            role: "ADMIN",
          },
        },
        subscription: {
          create: {
            plan: WorkspacePlan.FREE,
            status: SubStatus.ACTIVE,
          },
        },
      },
    });
  }

  return NextResponse.redirect(`${baseUrl}/verify-email?success=true`);
}

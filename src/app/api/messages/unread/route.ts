import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/messages/unread — total unread count for badge in sidebar
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ count: 0 });

  // Find ALL WorkspaceMember records for this user (they may belong to multiple workspaces)
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (memberships.length === 0) return NextResponse.json({ count: 0 });

  const myIds = memberships.map((m) => m.id);

  const count = await prisma.directMessage.count({
    where: { receiverId: { in: myIds }, readAt: null },
  });

  return NextResponse.json({ count });
}

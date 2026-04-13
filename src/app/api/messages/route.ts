import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPrimaryWorkspace } from "@/lib/subscription";

export const runtime = "nodejs";

// GET /api/messages — list all conversations (last message per contact + unread count)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await getUserPrimaryWorkspace(session.user.id);
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const me = await prisma.workspaceMember.findFirst({
    where: { workspaceId: workspace.id, userId: session.user.id },
    select: { id: true },
  });
  if (!me) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  // Get all messages I sent or received
  const allMessages = await prisma.directMessage.findMany({
    where: {
      workspaceId: workspace.id,
      OR: [{ senderId: me.id }, { receiverId: me.id }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
      receiver: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  // Build conversation map: one entry per "other person"
  const convMap = new Map<string, {
    member: { id: string; name: string; avatarUrl: string | null };
    lastMessage: { text: string; createdAt: Date; fromMe: boolean };
    unreadCount: number;
  }>();

  for (const msg of allMessages) {
    const other = msg.senderId === me.id ? msg.receiver : msg.sender;
    if (convMap.has(other.id)) {
      // Only update unread count for older messages
      if (!msg.readAt && msg.receiverId === me.id) {
        convMap.get(other.id)!.unreadCount++;
      }
    } else {
      convMap.set(other.id, {
        member: other,
        lastMessage: {
          text: msg.text,
          createdAt: msg.createdAt,
          fromMe: msg.senderId === me.id,
        },
        unreadCount: !msg.readAt && msg.receiverId === me.id ? 1 : 0,
      });
    }
  }

  return NextResponse.json({ conversations: Array.from(convMap.values()), myId: me.id });
}

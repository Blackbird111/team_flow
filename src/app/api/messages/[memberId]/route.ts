import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/messages/[memberId] — fetch thread with one member + mark as read
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Derive workspace from the other member's record
  const other = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: { id: true, name: true, avatarUrl: true, workspaceId: true },
  });
  if (!other) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  // Find current user in that same workspace
  const me = await prisma.workspaceMember.findFirst({
    where: { workspaceId: other.workspaceId, userId: session.user.id },
    select: { id: true },
  });
  if (!me) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const [messages] = await Promise.all([
    prisma.directMessage.findMany({
      where: {
        workspaceId: other.workspaceId,
        OR: [
          { senderId: me.id, receiverId: memberId },
          { senderId: memberId, receiverId: me.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, text: true, senderId: true, createdAt: true, readAt: true },
    }),
    // Mark all unread messages from this person as read
    prisma.directMessage.updateMany({
      where: { senderId: memberId, receiverId: me.id, readAt: null },
      data: { readAt: new Date() },
    }),
  ]);

  return NextResponse.json({ messages, myId: me.id, other });
}

// POST /api/messages/[memberId] — send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Derive workspace from the receiver's record
  const receiver = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: { id: true, workspaceId: true },
  });
  if (!receiver) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  // Find current user in that same workspace
  const me = await prisma.workspaceMember.findFirst({
    where: { workspaceId: receiver.workspaceId, userId: session.user.id },
    select: { id: true },
  });
  if (!me) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  if (me.id === memberId) return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });

  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });

  const message = await prisma.directMessage.create({
    data: {
      workspaceId: receiver.workspaceId,
      senderId: me.id,
      receiverId: memberId,
      text: text.trim(),
    },
    select: { id: true, text: true, senderId: true, createdAt: true, readAt: true },
  });

  return NextResponse.json({ message }, { status: 201 });
}

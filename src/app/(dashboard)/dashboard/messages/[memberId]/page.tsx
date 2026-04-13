import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChatView } from "@/components/messages/chat-view";

export const runtime = "nodejs";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Look up the other member first to get the workspace
  const other = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: { id: true, name: true, avatarUrl: true, workspaceId: true },
  });
  if (!other) notFound();

  // Find current user's WorkspaceMember in the SAME workspace as `other`
  const me = await prisma.workspaceMember.findFirst({
    where: { workspaceId: other.workspaceId, userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!me || me.id === other.id) notFound();

  const workspaceId = other.workspaceId;

  // Load initial messages + mark as read
  const [messages] = await Promise.all([
    prisma.directMessage.findMany({
      where: {
        workspaceId,
        OR: [
          { senderId: me.id, receiverId: other.id },
          { senderId: other.id, receiverId: me.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, text: true, senderId: true, createdAt: true, readAt: true },
    }),
    prisma.directMessage.updateMany({
      where: { senderId: other.id, receiverId: me.id, readAt: null },
      data: { readAt: new Date() },
    }),
  ]);

  // All workspace members for the sidebar list
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId, id: { not: me.id } },
    select: { id: true, name: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });

  return (
    <ChatView
      workspaceId={workspaceId}
      myId={me.id}
      other={{ id: other.id, name: other.name, avatarUrl: other.avatarUrl }}
      initialMessages={messages}
      members={members}
    />
  );
}

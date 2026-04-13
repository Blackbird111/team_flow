import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserPrimaryWorkspace } from "@/lib/subscription";
import { ConversationsPanel } from "@/components/messages/conversations-panel";

export const runtime = "nodejs";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Find ALL workspaces this user belongs to (invited memberships)
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    select: { id: true, workspaceId: true },
  });

  // Also check owned workspace as fallback
  if (memberships.length === 0) {
    const workspace = await getUserPrimaryWorkspace(session.user.id);
    if (!workspace) redirect("/onboarding");
    redirect("/dashboard");
  }

  // Use the first membership's workspace (prefer non-owned workspace if user was invited)
  // Prioritise workspace where user is NOT the owner
  const ownedWorkspace = await prisma.workspace.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true },
  });

  // Pick the most relevant workspace: prefer one they were INVITED to over their own solo workspace
  let workspaceId: string;
  const invitedMembership = memberships.find((m) => m.workspaceId !== ownedWorkspace?.id);
  if (invitedMembership) {
    workspaceId = invitedMembership.workspaceId;
  } else {
    workspaceId = memberships[0].workspaceId;
  }

  const me = memberships.find((m) => m.workspaceId === workspaceId)!;

  // All other workspace members
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId, id: { not: me.id } },
    select: { id: true, name: true, avatarUrl: true, role: true },
    orderBy: { name: "asc" },
  });

  // Last message + unread count per conversation
  const allMessages = await prisma.directMessage.findMany({
    where: {
      workspaceId,
      OR: [{ senderId: me.id }, { receiverId: me.id }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      text: true,
      senderId: true,
      receiverId: true,
      readAt: true,
      createdAt: true,
    },
  });

  // Build conversation summary per member
  const convMap = new Map<string, { lastText: string; lastAt: Date; fromMe: boolean; unread: number }>();
  for (const msg of allMessages) {
    const otherId = msg.senderId === me.id ? msg.receiverId : msg.senderId;
    if (!convMap.has(otherId)) {
      convMap.set(otherId, {
        lastText: msg.text,
        lastAt: msg.createdAt,
        fromMe: msg.senderId === me.id,
        unread: 0,
      });
    }
    if (!msg.readAt && msg.receiverId === me.id) {
      convMap.get(otherId)!.unread++;
    }
  }

  const membersWithConv = members.map((m) => ({
    ...m,
    conv: convMap.get(m.id) ?? null,
  }));

  // Sort: members with conversations first (by last message), then rest
  membersWithConv.sort((a, b) => {
    if (a.conv && b.conv) return b.conv.lastAt.getTime() - a.conv.lastAt.getTime();
    if (a.conv) return -1;
    if (b.conv) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Messages</h1>
        <p className="text-sm text-slate-500 mt-0.5">Direct messages with team members</p>
      </div>
      <ConversationsPanel members={membersWithConv} myId={me.id} />
    </div>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserPrimaryWorkspace } from "@/lib/subscription";
import { getProjectAccess, isManager } from "@/lib/project-auth";
import { TimeTab } from "@/components/time/time-tab";

export const runtime = "nodejs";

export default async function ProjectTimePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspace = await getUserPrimaryWorkspace(session.user.id);
  if (!workspace) redirect("/onboarding");

  const access = await getProjectAccess(projectId, session.user.id);
  if (!access) redirect("/dashboard");

  const canManage = isManager(access);

  const [logs, projectMembers, todoItems] = await Promise.all([
    prisma.timeLog.findMany({
      where: { projectId },
      orderBy: { loggedAt: "desc" },
      include: {
        workspaceMember: { select: { id: true, name: true, avatarUrl: true } },
        todoItem: { select: { id: true, text: true } },
      },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: {
        workspaceMember: { select: { id: true, name: true } },
      },
    }),
    prisma.todoItem.findMany({
      where: { projectId },
      select: { id: true, text: true },
      orderBy: { position: "asc" },
    }),
  ]);

  // Totals per member
  const totalsMap: Record<string, { name: string; minutes: number }> = {};
  for (const log of logs) {
    const mid = log.workspaceMember.id;
    if (!totalsMap[mid]) totalsMap[mid] = { name: log.workspaceMember.name, minutes: 0 };
    totalsMap[mid].minutes += log.minutes;
  }
  const totals = Object.entries(totalsMap).map(([id, t]) => ({ id, ...t }));

  return (
    <TimeTab
      projectId={projectId}
      logs={logs}
      totals={totals}
      projectMembers={projectMembers}
      todoItems={todoItems}
      currentWsMemberId={access.wsMember.id}
      canManage={canManage}
    />
  );
}

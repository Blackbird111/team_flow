import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserPrimaryWorkspace } from "@/lib/subscription";
import { getProjectAccess, isManager } from "@/lib/project-auth";
import { TeamTab } from "@/components/team/team-tab";

export const runtime = "nodejs";

export default async function ProjectTeamPage({
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

  const [projectMembers, allWsMembers] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId },
      include: {
        workspaceMember: {
          select: { id: true, name: true, email: true, avatarUrl: true, userId: true, hourlyRate: true },
        },
      },
      orderBy: { addedAt: "asc" },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, name: true, email: true, avatarUrl: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const inProjectIds = new Set(projectMembers.map((m) => m.workspaceMemberId));
  const available = allWsMembers.filter((m) => !inProjectIds.has(m.id));

  return (
    <TeamTab
      projectId={projectId}
      projectMembers={projectMembers}
      available={available}
      currentUserId={session.user.id}
      canManage={canManage}
    />
  );
}

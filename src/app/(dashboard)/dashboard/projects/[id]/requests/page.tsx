import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserPrimaryWorkspace } from "@/lib/subscription";
import { getProjectAccess, isManager } from "@/lib/project-auth";
import { RequestsTab } from "@/components/requests/requests-tab";

export const runtime = "nodejs";

export default async function ProjectRequestsPage({
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

  const [requests, sections] = await Promise.all([
    prisma.clientRequest.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.todoSection.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  return (
    <RequestsTab
      projectId={projectId}
      requests={requests}
      sections={sections}
      canManage={isManager(access)}
    />
  );
}

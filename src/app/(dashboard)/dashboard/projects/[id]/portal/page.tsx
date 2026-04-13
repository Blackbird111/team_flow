import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserPrimaryWorkspace } from "@/lib/subscription";
import { getProjectAccess, isManager } from "@/lib/project-auth";
import { PortalSettings } from "@/components/portal/portal-settings";

export const runtime = "nodejs";

export default async function ProjectPortalPage({
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

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      clientName: true,
      clientPortalEnabled: true,
      clientPortalSlug: true,
    },
  });
  if (!project) redirect("/dashboard");

  return (
    <PortalSettings
      project={project}
      canManage={isManager(access)}
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
    />
  );
}

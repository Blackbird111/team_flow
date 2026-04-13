// src/lib/project-auth.ts
import { prisma } from "@/lib/prisma";

export interface ProjectAccess {
  project: { id: string; workspaceId: string; name: string };
  wsMember: { id: string; role: string; name: string };
  projectMember: { id: string; role: string };
}

/**
 * Returns access info if the user is a member of the project, null otherwise.
 * A CLIENT role member can view but not mutate (check projectMember.role at call site).
 */
export async function getProjectAccess(
  projectId: string,
  userId: string
): Promise<ProjectAccess | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true, name: true },
  });
  if (!project) return null;

  const wsMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId: project.workspaceId, userId },
    select: { id: true, role: true, name: true },
  });
  if (!wsMember) return null;

  const projectMember = await prisma.projectMember.findFirst({
    where: { projectId, workspaceMemberId: wsMember.id },
    select: { id: true, role: true },
  });
  if (!projectMember) return null;

  return { project, wsMember, projectMember };
}

export function isManager(access: ProjectAccess): boolean {
  return (
    access.projectMember.role === "MANAGER" ||
    access.wsMember.role === "ADMIN"
  );
}

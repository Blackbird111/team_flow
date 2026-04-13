// src/app/api/projects/[id]/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess, isManager } from "@/lib/project-auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

// PATCH: toggle clientPortalEnabled, generate slug if enabling
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access || !isManager(access)) {
      return NextResponse.json({ error: "Only managers can manage the portal" }, { status: 403 });
    }

    const { enabled } = await req.json() as { enabled: boolean };

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, clientPortalSlug: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const slug = enabled
      ? (project.clientPortalSlug ?? generateSlug(project.name))
      : project.clientPortalSlug;

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { clientPortalEnabled: enabled, clientPortalSlug: slug },
      select: { clientPortalEnabled: true, clientPortalSlug: true },
    });

    return NextResponse.json({ portal: updated });
  } catch (error) {
    console.error("[PORTAL_PATCH]", error);
    return NextResponse.json({ error: "Failed to update portal" }, { status: 500 });
  }
}

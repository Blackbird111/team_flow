// src/app/api/projects/[id]/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectAccess, isManager } from "@/lib/project-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access || !isManager(access))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        status: parsed.data.status,
        archivedAt: parsed.data.status === "ARCHIVED" ? new Date() : null,
      },
      select: { id: true, status: true },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("[PROJECT_COMPLETE]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

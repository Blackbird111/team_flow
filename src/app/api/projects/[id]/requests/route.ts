// src/app/api/projects/[id]/requests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess } from "@/lib/project-auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const requests = await prisma.clientRequest.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        clientName: true,
        clientEmail: true,
        title: true,
        description: true,
        status: true,
        pmNote: true,
        convertedToTodoId: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("[REQUESTS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}

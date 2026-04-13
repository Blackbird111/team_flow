// src/app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess, isManager } from "@/lib/project-auth";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  clientName: z.string().max(100).nullable().optional(),
  deadline: z.string().nullable().optional(),
  budgetUsd: z.number().min(0).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access || !isManager(access)) {
      return NextResponse.json({ error: "Only managers can edit project settings" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.clientName !== undefined) data.clientName = parsed.data.clientName;
    if (parsed.data.deadline !== undefined) {
      data.deadline = parsed.data.deadline ? new Date(parsed.data.deadline) : null;
    }
    if (parsed.data.budgetUsd !== undefined) data.budgetUsd = parsed.data.budgetUsd;

    const project = await prisma.project.update({
      where: { id: projectId },
      data,
      select: { id: true, budgetUsd: true, name: true, deadline: true },
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error("[PROJECT_PATCH]", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

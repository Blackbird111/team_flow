// src/app/api/templates/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPrimaryWorkspace } from "@/lib/subscription";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await getUserPrimaryWorkspace(session.user.id);
    if (!workspace) {
      return NextResponse.json({ templates: [] });
    }

    const templates = await prisma.project.findMany({
      where: { workspaceId: workspace.id, isTemplate: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        templateName: true,
        description: true,
        _count: {
          select: { todoItems: true, todoSections: true },
        },
      },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("[TEMPLATES_GET]", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await getUserPrimaryWorkspace(session.user.id);
    if (!workspace) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const { templateId } = await req.json();
    if (!templateId) {
      return NextResponse.json({ error: "Missing templateId" }, { status: 400 });
    }

    // Verify template belongs to workspace
    const template = await prisma.project.findFirst({
      where: { id: templateId, workspaceId: workspace.id, isTemplate: true },
    });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await prisma.project.delete({ where: { id: templateId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TEMPLATES_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}

// src/app/api/projects/[id]/save-as-template/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess, isManager } from "@/lib/project-auth";
import { getUserPrimaryWorkspace } from "@/lib/subscription";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  templateName: z.string().min(1).max(80),
});

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access || !isManager(access)) {
      return NextResponse.json({ error: "Only managers can save templates" }, { status: 403 });
    }

    const workspace = await getUserPrimaryWorkspace(session.user.id);
    if (!workspace) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 });
    }

    const source = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        todoSections: {
          orderBy: { position: "asc" },
          include: {
            todoItems: { orderBy: { position: "asc" }, select: { text: true, position: true } },
          },
        },
        todoItems: {
          where: { sectionId: null },
          orderBy: { position: "asc" },
          select: { text: true, position: true },
        },
      },
    });
    if (!source) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Step 1: create template project + sections
    const template = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: parsed.data.templateName,
        templateName: parsed.data.templateName,
        isTemplate: true,
        description: source.description,
        todoSections: {
          create: source.todoSections.map((s) => ({
            title: s.title,
            position: s.position,
          })),
        },
      },
      include: { todoSections: { orderBy: { position: "asc" } } },
    });

    // Step 2: create items for each section + unsectioned items
    const itemCreates: Promise<unknown>[] = [];

    source.todoSections.forEach((srcSection, idx) => {
      const newSection = template.todoSections[idx];
      if (!newSection || srcSection.todoItems.length === 0) return;
      itemCreates.push(
        prisma.todoItem.createMany({
          data: srcSection.todoItems.map((item) => ({
            projectId: template.id,
            sectionId: newSection.id,
            text: item.text,
            position: item.position,
          })),
        })
      );
    });

    if (source.todoItems.length > 0) {
      itemCreates.push(
        prisma.todoItem.createMany({
          data: source.todoItems.map((item) => ({
            projectId: template.id,
            text: item.text,
            position: item.position,
          })),
        })
      );
    }

    await Promise.all(itemCreates);

    return NextResponse.json(
      { template: { id: template.id, templateName: template.templateName } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[SAVE_AS_TEMPLATE]", error);
    return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
  }
}

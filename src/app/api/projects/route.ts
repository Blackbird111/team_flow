// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWorkspaceCreateProject, getUserPrimaryWorkspace } from "@/lib/subscription";
import { z } from "zod";

export const runtime = "nodejs";

const VALID_COLORS = ["blue","green","purple","orange","red","teal","pink","yellow"] as const;

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(80),
  description: z.string().max(500).optional(),
  clientName: z.string().max(80).optional(),
  clientEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  deadline: z.string().optional(),
  budgetUsd: z.number().positive().optional(),
  templateId: z.string().optional(),
  color: z.enum(VALID_COLORS).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await getUserPrimaryWorkspace(session.user.id);
    if (!workspace) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }

    // Check plan limits
    const limitCheck = await canWorkspaceCreateProject(workspace.id);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
    }

    // Verify user is admin or member of workspace
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: workspace.id, userId: session.user.id },
    });
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { name, description, clientName, clientEmail, deadline, budgetUsd, templateId, color } = parsed.data;

    // Load template sections/items if templateId provided
    let templateData: {
      todoSections: { title: string; position: number; items: { text: string; position: number }[] }[];
      unsectionedItems: { text: string; position: number }[];
    } | null = null;

    if (templateId) {
      const tmpl = await prisma.project.findFirst({
        where: { id: templateId, workspaceId: workspace.id, isTemplate: true },
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
      if (tmpl) {
        templateData = {
          todoSections: tmpl.todoSections.map((s) => ({
            title: s.title,
            position: s.position,
            items: s.todoItems,
          })),
          unsectionedItems: tmpl.todoItems,
        };
      }
    }

    // Step 1: create project (with sections if template, no items yet)
    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name,
        description: description || null,
        clientName: clientName || null,
        clientEmail: clientEmail || null,
        deadline: deadline ? new Date(deadline) : null,
        budgetUsd: budgetUsd ?? null,
        color: color ?? "blue",
        members: {
          create: { workspaceMemberId: member.id, role: "MANAGER" },
        },
        ...(templateData && templateData.todoSections.length > 0 && {
          todoSections: {
            create: templateData.todoSections.map((s) => ({
              title: s.title,
              position: s.position,
            })),
          },
        }),
      },
      select: { id: true, name: true },
      ...(templateData && templateData.todoSections.length > 0 && {
        include: { todoSections: { orderBy: { position: "asc" } } },
      }),
    });

    // Step 2: copy items from template
    if (templateData) {
      const createdProject = await prisma.project.findUnique({
        where: { id: project.id },
        include: { todoSections: { orderBy: { position: "asc" } } },
      });

      const itemCreates: Promise<unknown>[] = [];

      templateData.todoSections.forEach((srcSection, idx) => {
        const newSection = createdProject?.todoSections[idx];
        if (!newSection || srcSection.items.length === 0) return;
        itemCreates.push(
          prisma.todoItem.createMany({
            data: srcSection.items.map((item) => ({
              projectId: project.id,
              sectionId: newSection.id,
              text: item.text,
              position: item.position,
            })),
          })
        );
      });

      if (templateData.unsectionedItems.length > 0) {
        itemCreates.push(
          prisma.todoItem.createMany({
            data: templateData.unsectionedItems.map((item) => ({
              projectId: project.id,
              text: item.text,
              position: item.position,
            })),
          })
        );
      }

      await Promise.all(itemCreates);
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("[PROJECTS_POST]", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

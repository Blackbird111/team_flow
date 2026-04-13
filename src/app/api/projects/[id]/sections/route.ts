// src/app/api/projects/[id]/sections/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess } from "@/lib/project-auth";
import { z } from "zod";

export const runtime = "nodejs";

const createSectionSchema = z.object({
  title: z.string().min(1).max(80),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    // Next position
    const last = await prisma.todoSection.findFirst({
      where: { projectId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const section = await prisma.todoSection.create({
      data: {
        projectId,
        title: parsed.data.title,
        position: (last?.position ?? 0) + 1,
      },
    });

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    console.error("[SECTIONS_POST]", error);
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { sectionId } = await req.json() as { sectionId: string };
    if (!sectionId) {
      return NextResponse.json({ error: "Missing sectionId" }, { status: 400 });
    }

    // Only allow deletion if section is empty
    const itemCount = await prisma.todoItem.count({ where: { sectionId } });
    if (itemCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete a section that still has tasks" },
        { status: 409 }
      );
    }

    await prisma.todoSection.delete({ where: { id: sectionId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SECTIONS_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { sectionId, title } = body as { sectionId: string; title: string };
    if (!sectionId || !title?.trim()) {
      return NextResponse.json({ error: "Missing sectionId or title" }, { status: 400 });
    }

    const section = await prisma.todoSection.update({
      where: { id: sectionId },
      data: { title: title.trim() },
    });

    return NextResponse.json({ section });
  } catch (error) {
    console.error("[SECTIONS_PATCH]", error);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}

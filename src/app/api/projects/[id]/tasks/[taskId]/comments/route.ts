// src/app/api/projects/[id]/tasks/[taskId]/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess } from "@/lib/project-auth";
import { notifyNewComment } from "@/lib/notifications";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; taskId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId, taskId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const comments = await prisma.comment.findMany({
      where: { todoItemId: taskId },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("[COMMENTS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

const createCommentSchema = z.object({
  text: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId, taskId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const comment = await prisma.comment.create({
      data: {
        todoItemId: taskId,
        authorId: access.wsMember.id,
        text: parsed.data.text,
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Notify task assignees (except commenter)
    const [task, project] = await Promise.all([
      prisma.todoItem.findUnique({
        where: { id: taskId },
        select: { text: true, assignees: { select: { workspaceMemberId: true } } },
      }),
      prisma.project.findUnique({ where: { id: projectId }, select: { name: true } }),
    ]);
    if (task) {
      notifyNewComment({
        taskText: task.text,
        projectId,
        projectName: project?.name ?? "Unknown project",
        assigneeIds: task.assignees.map((a) => a.workspaceMemberId),
        commenterWsMemberId: access.wsMember.id,
        commenterName: access.wsMember.name,
        commentText: parsed.data.text,
      });
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("[COMMENTS_POST]", error);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId, taskId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { commentId } = await req.json();
    if (!commentId) {
      return NextResponse.json({ error: "Missing commentId" }, { status: 400 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true },
    });
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const isAuthor = comment.authorId === access.wsMember.id;
    const isManager = access.projectMember.role === "MANAGER" || access.wsMember.role === "ADMIN";
    if (!isAuthor && !isManager) {
      return NextResponse.json({ error: "You can only delete your own comments" }, { status: 403 });
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[COMMENTS_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}

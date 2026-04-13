import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function getOwned(id: string, userId: string) {
  return prisma.personalTodo.findFirst({ where: { id, userId } });
}

// PATCH — toggle complete or update text/description
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todo = await getOwned(id, session.user.id);
  if (!todo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  const updated = await prisma.personalTodo.update({
    where: { id },
    data: {
      ...(typeof body.completed === "boolean" && {
        completed: body.completed,
        completedAt: body.completed ? new Date() : null,
      }),
      ...(body.text !== undefined && { text: body.text.trim() }),
      ...(body.description !== undefined && { description: body.description?.trim() || null }),
    },
  });

  return NextResponse.json({ todo: updated });
}

// DELETE — remove a todo
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todo = await getOwned(id, session.user.id);
  if (!todo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.personalTodo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

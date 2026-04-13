import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET — list all personal todos
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todos = await prisma.personalTodo.findMany({
    where: { userId: session.user.id },
    orderBy: [{ completed: "asc" }, { position: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ todos });
}

// POST — create a new todo
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, description } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Text required" }, { status: 400 });

  const maxPos = await prisma.personalTodo.aggregate({
    where: { userId: session.user.id },
    _max: { position: true },
  });

  const todo = await prisma.personalTodo.create({
    data: {
      userId: session.user.id,
      text: text.trim(),
      description: description?.trim() || null,
      position: (maxPos._max.position ?? 0) + 1,
    },
  });

  return NextResponse.json({ todo }, { status: 201 });
}

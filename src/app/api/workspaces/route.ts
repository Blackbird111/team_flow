// src/app/api/workspaces/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkspacePlan, SubStatus } from "@prisma/client";
import { z } from "zod";

export const runtime = "nodejs";

const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createWorkspaceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { name, slug } = parsed.data;

    // Ensure slug is unique
    const existing = await prisma.workspace.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "This URL is already taken. Please choose another." },
        { status: 409 }
      );
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        ownerId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            name: session.user.name ?? session.user.email,
            email: session.user.email,
            role: "ADMIN",
          },
        },
        subscription: {
          create: {
            plan: WorkspacePlan.FREE,
            status: SubStatus.ACTIVE,
          },
        },
      },
      select: { id: true, slug: true, name: true },
    });

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error("[WORKSPACES_POST]", error);
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }
}

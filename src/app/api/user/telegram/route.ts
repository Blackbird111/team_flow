// src/app/api/user/telegram/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPrimaryWorkspace } from "@/lib/subscription";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  telegramChatId: z.string().max(32).nullable(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await getUserPrimaryWorkspace(session.user.id);
    if (!workspace) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await prisma.workspaceMember.updateMany({
      where: { workspaceId: workspace.id, userId: session.user.id },
      data: { telegramChatId: parsed.data.telegramChatId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TELEGRAM_PATCH]", error);
    return NextResponse.json({ error: "Failed to update Telegram settings" }, { status: 500 });
  }
}

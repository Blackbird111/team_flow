// src/app/api/user/marketing-opt-out/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({ optOut: z.boolean() });

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid" }, { status: 400 });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { marketingOptOut: parsed.data.optOut },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[MARKETING_OPT_OUT]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

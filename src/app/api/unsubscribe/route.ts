// src/app/api/unsubscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const runtime = "nodejs";

function verifyToken(userId: string, token: string): boolean {
  const secret = process.env.AUTH_SECRET ?? "dev-secret";
  const expected = crypto.createHmac("sha256", secret).update(userId).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // Find user whose HMAC token matches
    // We can't reverse HMAC, so we query all non-opted-out users and check
    // In production you'd want a stored token column; this works for moderate user counts
    const users = await prisma.user.findMany({
      where: { marketingOptOut: false },
      select: { id: true },
    });

    const match = users.find((u) => verifyToken(u.id, token));
    if (!match) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: match.id },
      data: { marketingOptOut: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[UNSUBSCRIBE]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

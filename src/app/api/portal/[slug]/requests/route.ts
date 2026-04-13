// src/app/api/portal/[slug]/requests/route.ts
// Public endpoint — no auth required
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

const schema = z.object({
  clientName: z.string().min(1).max(80),
  clientEmail: z.string().email().optional().or(z.literal("")),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;

    const project = await prisma.project.findFirst({
      where: { clientPortalSlug: slug, clientPortalEnabled: true },
      select: { id: true, name: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const request = await prisma.clientRequest.create({
      data: {
        projectId: project.id,
        clientName: parsed.data.clientName,
        clientEmail: parsed.data.clientEmail || null,
        title: parsed.data.title,
        description: parsed.data.description || null,
      },
    });

    // Fire-and-forget: notify managers
    (async () => {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const from = process.env.RESEND_FROM_EMAIL ?? "noreply@teamflow.app";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const token = process.env.TELEGRAM_BOT_TOKEN;

        const managers = await prisma.projectMember.findMany({
          where: { projectId: project.id, role: "MANAGER" },
          include: {
            workspaceMember: { select: { email: true, telegramChatId: true } },
          },
        });

        const projectUrl = `${appUrl}/dashboard/projects/${project.id}/requests`;
        const msg = `📩 New client request in <b>${project.name}</b>:\n"${parsed.data.title}"\nFrom: ${parsed.data.clientName}`;

        for (const pm of managers) {
          const wm = pm.workspaceMember;
          if (wm.telegramChatId && token) {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: wm.telegramChatId, text: msg, parse_mode: "HTML" }),
            }).catch(() => {});
          } else if (wm.email) {
            await resend.emails.send({
              from,
              to: wm.email,
              subject: `New client request: ${parsed.data.title}`,
              html: `<div style="font-family:sans-serif;max-width:520px"><h2>New client request</h2><p><b>${parsed.data.clientName}</b> submitted a request in <b>${project.name}</b>:</p><blockquote style="border-left:3px solid #7c3aed;padding-left:12px;margin:12px 0"><b>${parsed.data.title}</b>${parsed.data.description ? `<br>${parsed.data.description}` : ""}</blockquote><a href="${projectUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">View request</a></div>`,
            }).catch(() => {});
          }
        }
      } catch {
        // silent
      }
    })();

    return NextResponse.json({ request: { id: request.id } }, { status: 201 });
  } catch (error) {
    console.error("[PORTAL_REQUEST_POST]", error);
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}

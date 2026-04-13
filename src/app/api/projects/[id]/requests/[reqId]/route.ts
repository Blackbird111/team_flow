// src/app/api/projects/[id]/requests/[reqId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectAccess, isManager } from "@/lib/project-auth";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; reqId: string }> };

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("accept"),
    sectionId: z.string().nullable().optional(),
  }),
  z.object({
    action: z.literal("decline"),
    pmNote: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("clarification"),
    pmNote: z.string().min(1).max(500),
  }),
]);

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId, reqId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccess(projectId, session.user.id);
    if (!access || !isManager(access)) {
      return NextResponse.json({ error: "Only managers can action requests" }, { status: 403 });
    }

    const clientRequest = await prisma.clientRequest.findFirst({
      where: { id: reqId, projectId },
    });
    if (!clientRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    if (parsed.data.action === "accept") {
      // Create a todo item from the request
      const last = await prisma.todoItem.findFirst({
        where: { projectId, sectionId: parsed.data.sectionId ?? null },
        orderBy: { position: "desc" },
        select: { position: true },
      });

      const todoItem = await prisma.todoItem.create({
        data: {
          projectId,
          sectionId: parsed.data.sectionId ?? null,
          text: clientRequest.title,
          position: (last?.position ?? 0) + 1,
        },
      });

      const updated = await prisma.clientRequest.update({
        where: { id: reqId },
        data: {
          status: "ACCEPTED",
          convertedToTodoId: todoItem.id,
          resolvedAt: new Date(),
        },
      });

      return NextResponse.json({ request: updated });
    }

    if (parsed.data.action === "decline") {
      const updated = await prisma.clientRequest.update({
        where: { id: reqId },
        data: {
          status: "DECLINED",
          pmNote: parsed.data.pmNote ?? null,
          resolvedAt: new Date(),
        },
      });
      return NextResponse.json({ request: updated });
    }

    if (parsed.data.action === "clarification") {
      const updated = await prisma.clientRequest.update({
        where: { id: reqId },
        data: {
          status: "CLARIFICATION",
          pmNote: parsed.data.pmNote,
        },
      });

      // Notify client by email if email provided
      if (clientRequest.clientEmail) {
        (async () => {
          try {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);
            const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
            const project = await prisma.project.findUnique({
              where: { id: projectId },
              select: { name: true, clientPortalSlug: true },
            });
            const portalUrl = project?.clientPortalSlug
              ? `${appUrl}/portal/${project.clientPortalSlug}`
              : appUrl;
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL ?? "noreply@teamflow.app",
              to: clientRequest.clientEmail as string,
              subject: `Clarification needed: ${clientRequest.title}`,
              html: `<div style="font-family:sans-serif;max-width:520px"><h2>Clarification needed</h2><p>Your request "<b>${clientRequest.title}</b>" in <b>${project?.name}</b> needs clarification:</p><blockquote style="border-left:3px solid #7c3aed;padding-left:12px;margin:12px 0">${parsed.data.action === "clarification" ? parsed.data.pmNote : ""}</blockquote><a href="${portalUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">View portal</a></div>`,
            });
          } catch {
            // silent
          }
        })();
      }

      return NextResponse.json({ request: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[REQUEST_PATCH]", error);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}

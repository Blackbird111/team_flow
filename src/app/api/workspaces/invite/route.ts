// src/app/api/workspaces/invite/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { z } from "zod";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Caller must be workspace admin
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
      select: { id: true, name: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }

    const adminCheck = await prisma.workspaceMember.findFirst({
      where: { workspaceId: workspace.id, userId: session.user.id, role: "ADMIN" },
    });
    if (!adminCheck) {
      return NextResponse.json({ error: "Only admins can invite members" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { email, role } = parsed.data;

    // Already a member?
    const existing = await prisma.workspaceMember.findFirst({
      where: { workspaceId: workspace.id, email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This person is already a member of your workspace." },
        { status: 409 }
      );
    }

    // Upsert invite (reset token + expiry if re-inviting)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await prisma.workspaceInvite.upsert({
      where: { workspaceId_email: { workspaceId: workspace.id, email } },
      create: {
        workspaceId: workspace.id,
        email,
        role,
        invitedById: session.user.id,
        expiresAt,
      },
      update: {
        role,
        invitedById: session.user.id,
        expiresAt,
        acceptedAt: null,
        // regenerate token by updating a field that triggers cuid default won't help —
        // we need to explicitly set a new token
        token: crypto.randomUUID(),
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${baseUrl}/invite?token=${invite.token}`;
    const inviterName = session.user.name ?? session.user.email ?? "Someone";

    const emailResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@resend.dev",
      to: email,
      subject: `${inviterName} invited you to ${workspace.name} on TeamFlow`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#2563EB;padding:32px;text-align:center;">
  <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">TeamFlow</h1>
</td></tr>
<tr><td style="padding:40px 32px;">
  <h2 style="margin:0 0 12px;color:#18181b;font-size:20px;">You've been invited</h2>
  <p style="margin:0 0 8px;color:#52525b;font-size:15px;">Hi there,</p>
  <p style="margin:0 0 24px;color:#52525b;font-size:15px;">
    <strong>${inviterName}</strong> has invited you to join <strong>${workspace.name}</strong> on TeamFlow.
  </p>
  <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
    <a href="${inviteUrl}" style="display:inline-block;background:#2563EB;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
      Accept Invitation
    </a>
  </td></tr></table>
  <p style="margin:16px 0 0;color:#71717a;font-size:13px;text-align:center;">
    Or copy this link: ${inviteUrl}
  </p>
  <p style="margin:16px 0 0;color:#a1a1aa;font-size:13px;text-align:center;">
    This invite expires in 7 days. If you didn't expect this, ignore it.
  </p>
</td></tr>
</table>
</td></tr></table>
</body></html>`,
    });

    // Surface Resend errors (e.g. unverified domain in production)
    if (emailResult.error) {
      console.error("[INVITE_EMAIL_ERROR]", emailResult.error);
      // Invite was created but email failed — return warning so UI can inform user
      return NextResponse.json(
        { success: true, emailWarning: emailResult.error.message },
        { status: 201 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[INVITE_POST]", error);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}

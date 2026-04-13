import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomBytes } from "crypto";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 12);

    const token = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        verificationToken: token,
        verificationTokenExpiry: expiry,
      },
    });

    const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;

    const { error: resendError } = await resend.emails.send({
      from: "noreply@siteforge.cloud",
      to: email,
      subject: "Verify your email address",
      html: `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;"><tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;"><tr><td style="background:#7C3AED;padding:32px;text-align:center;"><h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">SAAS-STARTER</h1></td></tr><tr><td style="padding:40px 32px;"><h2 style="margin:0 0 12px;color:#18181b;font-size:20px;">Verify your email</h2><p style="margin:0 0 8px;color:#52525b;font-size:15px;">Hi ${name},</p><p style="margin:0 0 28px;color:#52525b;font-size:15px;">Click the button below to verify your email. Link expires in <strong>24 hours</strong>.</p><table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center"><a href="${verifyUrl}" style="display:inline-block;background:#7C3AED;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Verify Email Address</a></td></tr></table><p style="margin:24px 0 0;color:#a1a1aa;font-size:13px;text-align:center;">If you did not sign up, ignore this email.</p></td></tr></table></td></tr></table></body></html>`,
    });

    if (resendError) {
      console.error("[RESEND ERROR]", resendError);
    }

    return NextResponse.json(
      { message: "Check your email to verify your account." },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[REGISTER ERROR]", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

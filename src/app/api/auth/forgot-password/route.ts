// src/app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const { email } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return 200 to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account exists, a reset email has been sent.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const identifier = `password-reset:${email}`;

    // Delete old tokens by identifier (safe — no error if none exist)
    await prisma.$executeRaw`
      DELETE FROM "VerificationToken" WHERE identifier = ${identifier}
    `;

    await prisma.verificationToken.create({
      data: { identifier, token, expires },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
      to: email,
      subject: "Reset your password",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a; font-size: 24px; font-weight: bold; margin-bottom: 16px;">
            Reset your password
          </h1>
          <p style="color: #4a4a4a; font-size: 16px; margin-bottom: 24px;">
            We received a request to reset the password for your account.
            Click the button below to reset it. This link expires in 1 hour.
          </p>
          
            href="${resetUrl}"
            style="display: inline-block; background-color: #6366f1; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: 500; margin-bottom: 24px;"
          >
            Reset password
          </a>
          <p style="color: #6a6a6a; font-size: 14px; margin-bottom: 8px;">
            If you didn&apos;t request this, you can safely ignore this email.
          </p>
          <p style="color: #6a6a6a; font-size: 14px;">
            Or copy and paste this URL:
            <a href="${resetUrl}" style="color: #6366f1;">${resetUrl}</a>
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      message: "If an account exists, a reset email has been sent.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    console.error("[FORGOT_PASSWORD]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
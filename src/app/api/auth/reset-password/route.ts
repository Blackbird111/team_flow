import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  token: z.string().min(1, "Token is required"),
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const { token, email, password } = schema.parse(body);

    const identifier = `password-reset:${email}`;

    // Find the token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier, token } },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 },
      );
    }

    // Check expiry
    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await prisma.verificationToken
        .delete({ where: { identifier_token: { identifier, token } } })
        .catch(() => undefined);

      return NextResponse.json(
        {
          error:
            "This reset link has expired. Please request a new one.",
        },
        { status: 400 },
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    // Delete the used token
    await prisma.verificationToken
      .delete({ where: { identifier_token: { identifier, token } } })
      .catch(() => undefined);

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    console.error("[RESET_PASSWORD]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
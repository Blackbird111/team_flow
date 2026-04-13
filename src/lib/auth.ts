// src/lib/auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/prisma";
import { WorkspacePlan, SubStatus } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify-request",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY!,
      from: process.env.RESEND_FROM_EMAIL!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        // ✅ Block sign in if email not verified
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        const bcrypt = await import("bcryptjs");
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          return null;
        }

        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
      }
      // Check workspace on sign-in and whenever session is updated
      if (user || trigger === "update") {
        const userId = (token.id ?? user?.id) as string | undefined;
        if (userId) {
          const ws = await prisma.workspace.findFirst({
            where: { ownerId: userId },
            select: { id: true },
          });
          token.hasWorkspace = !!ws;
          token.workspaceId = ws?.id ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.hasWorkspace = token.hasWorkspace as boolean | undefined;
        session.user.workspaceId = token.workspaceId as string | null | undefined;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Generate a URL-safe slug from name or email
      const base = (user.name ?? user.email ?? user.id!)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
      const suffix = Math.random().toString(36).slice(2, 6);
      const slug = `${base}-${suffix}`;

      await prisma.workspace.create({
        data: {
          name: user.name ? `${user.name}'s Workspace` : "My Workspace",
          slug,
          ownerId: user.id!,
          members: {
            create: {
              userId: user.id!,
              name: user.name ?? user.email ?? "Owner",
              email: user.email ?? "",
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
      });
    },
  },
});
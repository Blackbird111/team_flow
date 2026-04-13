import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      hasWorkspace?: boolean;
      workspaceId?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    hasWorkspace?: boolean;
    workspaceId?: string | null;
  }
}

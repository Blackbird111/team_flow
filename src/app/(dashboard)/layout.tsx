import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserPrimaryWorkspace } from "@/lib/subscription";
import { NavUserButton } from "@/components/auth/nav-user-button";
import { TopNav } from "@/components/dashboard/top-nav";
import Link from "next/link";
import { Layers } from "lucide-react";

export const runtime = "nodejs";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const workspaceFull = await getUserPrimaryWorkspace(session.user.id);
  if (!workspaceFull) redirect("/onboarding");
  const workspace = { id: workspaceFull.id, name: workspaceFull.name };

  // Update lastActiveAt (fire-and-forget)
  prisma.user.update({
    where: { id: session.user.id },
    data: { lastActiveAt: new Date() },
  }).catch(() => {});

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top navbar */}
      <header className="h-14 shrink-0 bg-[#1e2a3b] border-b border-white/8 flex items-center px-4 gap-4">
        {/* Logo */}
        <Link href="/dashboard/my-tasks" className="flex items-center gap-2 shrink-0 group">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Layers className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold tracking-tight text-sm text-white">
            Team<span className="text-blue-400">Flow</span>
          </span>
        </Link>

        {/* Divider */}
        <div className="h-5 w-px bg-white/10 shrink-0" />

        {/* Workspace name */}
        <span className="text-xs text-white/40 font-medium truncate hidden sm:block max-w-[140px]">
          {workspace.name}
        </span>

        {/* Nav links — grow to fill */}
        <div className="flex-1 flex items-center">
          <TopNav />
        </div>

        {/* User button */}
        <div className="shrink-0">
          <NavUserButton
            name={session.user.name}
            email={session.user.email}
            image={session.user.image}
          />
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}

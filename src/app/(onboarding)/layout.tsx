import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserPrimaryWorkspace } from "@/lib/subscription";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";
import { Layers } from "lucide-react";

export const runtime = "nodejs";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Already has or belongs to a workspace → go to dashboard
  const existing = await getUserPrimaryWorkspace(session.user.id);
  if (existing) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex h-14 items-center justify-between border-b border-border/60 px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold tracking-tight text-sm">
            Team<span className="text-violet-500">Flow</span>
          </span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        {children}
      </main>
    </div>
  );
}

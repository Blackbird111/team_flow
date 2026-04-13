import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserPrimaryWorkspace } from "@/lib/subscription";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const runtime = "nodejs";

export const metadata = {
  title: "New Project — TeamFlow",
};

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspace = await getUserPrimaryWorkspace(session.user.id);
  if (!workspace) redirect("/onboarding");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New Project</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Fill in the details. You can always edit them later.
        </p>
      </div>

      <CreateProjectForm />
    </div>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserPrimaryWorkspace } from "@/lib/subscription";
import { Users } from "lucide-react";
import { InviteMemberButton } from "@/components/members/invite-member-button";
import { MembersList } from "@/components/members/members-list";

export const runtime = "nodejs";

export const metadata = {
  title: "Members — TeamFlow",
};

export default async function MembersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspace = await getUserPrimaryWorkspace(session.user.id);
  if (!workspace) redirect("/onboarding");

  const [members, projects] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      include: {
        user: { select: { image: true } },
        projectMembers: {
          include: {
            project: { select: { id: true, name: true, color: true, status: true } },
          },
        },
      },
      // note field is now included automatically
    }),
    prisma.project.findMany({
      where: { workspaceId: workspace.id, status: { not: "ARCHIVED" }, isTemplate: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  const currentMember = members.find((m) => m.userId === session.user.id);
  const isAdmin = currentMember?.role === "ADMIN";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Members</h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            {members.length} member{members.length !== 1 ? "s" : ""} in {workspace.name}
          </p>
        </div>
        {isAdmin && <InviteMemberButton />}
      </div>

      {members.length === 1 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center">
          <Users className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-700">You&apos;re the only one here</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Invite your team to start collaborating on projects.
          </p>
          {isAdmin && <InviteMemberButton />}
        </div>
      ) : (
        <MembersList
          members={members.map((m) => ({
            id: m.id,
            name: m.name,
            note: m.note ?? null,
            email: m.email ?? "",
            role: m.role,
            avatarUrl: m.user?.image ?? m.avatarUrl ?? null,
            userId: m.userId,
            projects: m.projectMembers.map((pm) => ({
              projectMemberId: pm.id,
              projectId: pm.project.id,
              name: pm.project.name,
              color: pm.project.color,
              status: pm.project.status,
              projectRole: pm.role,
            })),
          }))}
          allProjects={projects}
          currentUserId={session.user.id}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

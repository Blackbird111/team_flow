import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";

export const runtime = "nodejs";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) redirect("/login");

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: {
      workspace: { select: { name: true } },
      invitedBy: { select: { name: true } },
    },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return (
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold">Invite expired or invalid</h1>
        <p className="text-muted-foreground text-sm">
          This invite link is no longer valid. Ask your team admin to resend it.
        </p>
      </div>
    );
  }

  const session = await auth();

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">You&apos;re invited!</h1>
        <p className="text-muted-foreground text-sm">
          <strong>{invite.invitedBy.name ?? "Someone"}</strong> invited you to join{" "}
          <strong>{invite.workspace.name}</strong> on TeamFlow.
        </p>
      </div>
      <AcceptInviteForm
        token={token}
        workspaceName={invite.workspace.name}
        email={invite.email}
        isLoggedIn={!!session?.user}
        loggedInEmail={session?.user?.email ?? null}
      />
    </div>
  );
}

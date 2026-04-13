// src/app/api/subscription/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserPrimaryWorkspace, getWorkspaceUsageStats } from "@/lib/subscription";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await getUserPrimaryWorkspace(session.user.id);

    if (!workspace) {
      return NextResponse.json({ subscription: null, usage: null });
    }

    const usage = await getWorkspaceUsageStats(workspace.id);

    return NextResponse.json({
      subscription: workspace.subscription,
      usage,
      workspaceId: workspace.id,
    });
  } catch (error) {
    console.error("[SUBSCRIPTION_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MyTasksBoard } from "@/components/my-tasks/my-tasks-board";

export const runtime = "nodejs";

export default async function MyTasksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const todos = await prisma.personalTodo.findMany({
    where: { userId: session.user.id },
    orderBy: [{ completed: "asc" }, { position: "asc" }, { createdAt: "asc" }],
  });

  const userName = session.user.name?.split(" ")[0] ?? "there";

  return <MyTasksBoard initialTodos={todos} userName={userName} />;
}

export interface BoardMember {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface BoardAssignee {
  id: string;
  completed: boolean;
  completedAt: Date | null;
  workspaceMember: BoardMember;
}

export interface BoardItem {
  id: string;
  text: string;
  description: string | null;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED";
  position: number;
  createdAt: Date;
  completedAt: Date | null;
  assignees: BoardAssignee[];
  _count: { comments: number };
}

export interface BoardSection {
  id: string;
  title: string;
  position: number;
}

export interface ProjectMemberWithMember {
  id: string;
  role: string;
  workspaceMember: BoardMember & { userId: string | null };
}

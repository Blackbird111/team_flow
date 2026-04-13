"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ConvMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  conv: {
    lastText: string;
    lastAt: Date;
    fromMe: boolean;
    unread: number;
  } | null;
}

function fmtTime(d: Date): string {
  const date = new Date(d);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Avatar({ name, avatarUrl, size = "md" }: { name: string; avatarUrl: string | null; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={cn("rounded-full object-cover shrink-0", sizeClass)} />;
  }
  return (
    <div className={cn("rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 shrink-0", sizeClass)}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function ConversationsPanel({ members, myId: _myId }: { members: ConvMember[]; myId: string }) {
  const router = useRouter();

  // Poll every 5s so new incoming messages appear without manual reload
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(interval);
  }, [router]);

  const withConv = members.filter((m) => m.conv);
  const withoutConv = members.filter((m) => !m.conv);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {members.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="h-14 w-14 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
            <MessageSquare className="h-7 w-7 text-blue-500" />
          </div>
          <p className="text-base font-semibold text-slate-800">No team members yet</p>
          <p className="text-sm text-slate-500 mt-1">Invite members to your workspace to start messaging.</p>
        </div>
      )}

      {/* Conversations */}
      {withConv.length > 0 && (
        <>
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recent conversations</p>
          </div>
          {withConv.map((m) => (
            <MemberRow key={m.id} member={m} />
          ))}
        </>
      )}

      {/* Other members */}
      {withoutConv.length > 0 && (
        <>
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {withConv.length > 0 ? "Other members" : "Team members"}
            </p>
          </div>
          {withoutConv.map((m) => (
            <MemberRow key={m.id} member={m} />
          ))}
        </>
      )}
    </div>
  );
}

function MemberRow({ member: m }: { member: ConvMember }) {
  return (
    <Link
      href={`/dashboard/messages/${m.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 group"
    >
      <div className="relative shrink-0">
        <Avatar name={m.name} avatarUrl={m.avatarUrl} />
        {m.conv && m.conv.unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {m.conv.unread > 9 ? "9+" : m.conv.unread}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-sm font-semibold text-slate-800", m.conv?.unread && "text-slate-900")}>
            {m.name}
          </span>
          {m.conv && (
            <span className="text-xs text-slate-400 shrink-0">{fmtTime(m.conv.lastAt)}</span>
          )}
        </div>
        {m.conv ? (
          <p className={cn(
            "text-sm truncate mt-0.5",
            m.conv.unread > 0 ? "text-slate-700 font-medium" : "text-slate-400"
          )}>
            {m.conv.fromMe && <span className="text-slate-400 font-normal">You: </span>}
            {m.conv.lastText}
          </p>
        ) : (
          <p className="text-sm text-slate-400 mt-0.5">
            {m.role === "ADMIN" ? "Admin" : "Member"} · No messages yet
          </p>
        )}
      </div>

      <MessageSquare className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
    </Link>
  );
}

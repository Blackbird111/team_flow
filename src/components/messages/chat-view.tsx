"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Date | string;
  readAt: Date | string | null;
}

interface Member {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface ChatViewProps {
  workspaceId: string;
  myId: string;
  other: Member;
  initialMessages: Message[];
  members: Member[];
}

function fmtTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function fmtDate(d: Date | string): string {
  const date = new Date(d);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function Avatar({ name, avatarUrl, size = "md" }: { name: string; avatarUrl: string | null; size?: "sm" | "md" | "lg" }) {
  const sizeClass = { sm: "h-7 w-7 text-xs", md: "h-8 w-8 text-xs", lg: "h-10 w-10 text-sm" }[size];
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={cn("rounded-full object-cover shrink-0", sizeClass)} />;
  }
  return (
    <div className={cn("rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 shrink-0", sizeClass)}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function ChatView({ workspaceId: _workspaceId, myId, other, initialMessages, members }: ChatViewProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch(`/api/messages/${other.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setMessages(data.messages);
      } catch {
        // ignore network errors during polling
      }
    }

    pollingRef.current = setInterval(poll, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [other.id]);

  async function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText("");

    try {
      const res = await fetch(`/api/messages/${other.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        router.refresh();
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Group messages by date
  type MessageGroup = { date: string; messages: Message[] };
  const groups: MessageGroup[] = [];
  for (const msg of messages) {
    const d = fmtDate(msg.createdAt);
    if (!groups.length || groups[groups.length - 1].date !== d) {
      groups.push({ date: d, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-10rem)] min-h-0">
      {/* Left: member list */}
      <div className="hidden lg:flex w-56 shrink-0 flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Team</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {members.map((m) => (
            <Link
              key={m.id}
              href={`/dashboard/messages/${m.id}`}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors",
                m.id === other.id && "bg-blue-50 border-r-2 border-blue-500"
              )}
            >
              <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
              <span className={cn(
                "text-sm font-medium truncate",
                m.id === other.id ? "text-blue-700" : "text-slate-700"
              )}>
                {m.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Right: chat area */}
      <div className="flex-1 min-w-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
          <Link
            href="/dashboard/messages"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Avatar name={other.name} avatarUrl={other.avatarUrl} />
          <div>
            <p className="text-sm font-bold text-slate-900">{other.name}</p>
            <p className="text-xs text-slate-400">Workspace member</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                <Avatar name={other.name} avatarUrl={other.avatarUrl} size="md" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Start a conversation with {other.name}</p>
              <p className="text-xs text-slate-400 mt-1">Your messages are private to both of you.</p>
            </div>
          )}

          {groups.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs font-medium text-slate-400 px-2">{group.date}</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              <div className="space-y-1.5">
                {group.messages.map((msg, i) => {
                  const isMe = msg.senderId === myId;
                  const prev = i > 0 ? group.messages[i - 1] : null;
                  const showAvatar = !isMe && (!prev || prev.senderId !== msg.senderId);

                  return (
                    <div
                      key={msg.id}
                      className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}
                    >
                      {/* Avatar placeholder for alignment */}
                      {!isMe && (
                        <div className="w-7 shrink-0">
                          {showAvatar && <Avatar name={other.name} avatarUrl={other.avatarUrl} size="sm" />}
                        </div>
                      )}

                      <div className={cn("max-w-[70%] group", isMe ? "items-end" : "items-start", "flex flex-col")}>
                        <div className={cn(
                          "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                          isMe
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-slate-100 text-slate-800 rounded-bl-sm"
                        )}>
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-300 mt-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {fmtTime(msg.createdAt)}
                          {isMe && msg.readAt && <span className="ml-1 text-blue-400">· Read</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-white">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${other.name}…`}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all max-h-32 min-h-[42px]"
              style={{ height: "auto" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 128) + "px";
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!text.trim() || sending}
              className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center justify-center transition-colors shrink-0"
              title="Send (Enter)"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-slate-300 mt-1.5 pl-1">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}

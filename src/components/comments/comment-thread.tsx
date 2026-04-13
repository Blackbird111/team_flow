"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Trash2, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
}

interface CommentThreadProps {
  projectId: string;
  taskId: string;
  taskText: string;
  currentWsMemberId: string | null;
  onClose: () => void;
}

function formatTime(d: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}

export function CommentThread({
  projectId,
  taskId,
  taskText,
  currentWsMemberId,
  onClose,
}: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const url = `/api/projects/${projectId}/tasks/${taskId}/comments`;

  useEffect(() => {
    fetch(url)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .finally(() => setIsLoading(false));
  }, [url]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setIsSending(true);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setComments((prev) => [...prev, data.comment]);
      setText("");
    }
    setIsSending(false);
  }

  async function handleDelete(commentId: string) {
    await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-background border-l border-border shadow-xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3 border-b border-border">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">Comments</p>
          <p className="text-sm font-medium truncate">{taskText}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && comments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No comments yet.</p>
            <p className="text-xs text-muted-foreground mt-0.5">Be the first to comment.</p>
          </div>
        )}

        {comments.map((comment) => {
          const isOwn = comment.author.id === currentWsMemberId;
          return (
            <div key={comment.id} className={cn("flex gap-2.5 group", isOwn && "flex-row-reverse")}>
              {/* Avatar */}
              <div className="h-7 w-7 rounded-full bg-violet-400/20 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300 shrink-0 mt-0.5">
                {comment.author.name.charAt(0).toUpperCase()}
              </div>

              <div className={cn("flex-1 min-w-0 space-y-1", isOwn && "items-end flex flex-col")}>
                <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", isOwn && "flex-row-reverse")}>
                  <span className="font-medium">{comment.author.name}</span>
                  <span>{formatTime(comment.createdAt)}</span>
                </div>
                <div className={cn(
                  "relative rounded-2xl px-3 py-2 text-sm max-w-[85%]",
                  isOwn
                    ? "bg-violet-500 text-white rounded-tr-sm"
                    : "bg-muted rounded-tl-sm"
                )}>
                  {comment.text}
                  {/* Delete */}
                  {isOwn && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 transition-all shadow-sm"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 py-3 border-t border-border">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment… (Enter to send)"
            rows={2}
            disabled={isSending}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="sm"
            className="h-10 w-10 p-0 rounded-xl shrink-0"
            disabled={isSending || !text.trim()}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { Eye, EyeOff } from "lucide-react";
import { useHideCompleted } from "@/components/tasks/hide-completed-context";

export function HideCompletedButton({ completedCount }: { completedCount: number }) {
  const { hideCompleted, toggleHideCompleted } = useHideCompleted();

  if (completedCount === 0) return null;

  return (
    <button
      onClick={toggleHideCompleted}
      className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100"
    >
      {hideCompleted ? (
        <>
          <Eye className="h-3.5 w-3.5" />
          Show completed ({completedCount})
        </>
      ) : (
        <>
          <EyeOff className="h-3.5 w-3.5" />
          Hide completed ({completedCount})
        </>
      )}
    </button>
  );
}

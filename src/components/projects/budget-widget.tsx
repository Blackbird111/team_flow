"use client";

import { useState } from "react";
import { DollarSign, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface BudgetWidgetProps {
  projectId: string;
  budgetUsd: number | null;
  spentUsd: number;
  canManage: boolean;
}

function fmt(n: number): string {
  if (n >= 10000) return `$${Math.round(n / 1000)}k`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function BudgetWidget({
  projectId,
  budgetUsd,
  spentUsd,
  canManage,
}: BudgetWidgetProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(budgetUsd?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [localBudget, setLocalBudget] = useState(budgetUsd);

  const pct =
    localBudget && localBudget > 0
      ? Math.round((spentUsd / localBudget) * 100)
      : 0;

  // Color thresholds: >100% red, >80% orange, else green/default
  const isOver = pct > 100;
  const isWarning = !isOver && pct > 80;

  const badgeCls = isOver
    ? "text-red-600 border-red-300 bg-red-50"
    : isWarning
      ? "text-orange-600 border-orange-300 bg-orange-50"
      : "text-slate-500 border-slate-200 bg-slate-50";

  const barColor = isOver ? "#ef4444" : isWarning ? "#f97316" : "#22c55e";

  async function handleSave() {
    const trimmed = inputValue.trim();
    const num = trimmed === "" ? null : parseFloat(trimmed);
    if (num !== null && isNaN(num)) return;
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budgetUsd: num }),
    });
    setSaving(false);
    if (res.ok) {
      setLocalBudget(num);
      setEditing(false);
      router.refresh();
    }
  }

  function startEdit() {
    setInputValue(localBudget?.toString() ?? "");
    setEditing(true);
  }

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="flex items-center gap-1.5"
      >
        <DollarSign className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <input
          type="number"
          min="0"
          step="100"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          autoFocus
          disabled={saving}
          placeholder="e.g. 5000"
          className="w-24 text-xs border border-slate-200 rounded px-1.5 py-0.5 bg-white outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button
          type="submit"
          disabled={saving}
          className="p-0.5 text-emerald-500 hover:text-emerald-600 transition-colors"
          title="Save"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
          title="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </form>
    );
  }

  if (!localBudget) {
    if (!canManage) return null;
    return (
      <button
        onClick={startEdit}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-dashed border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors"
      >
        <DollarSign className="h-3.5 w-3.5" />
        Set budget
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1 min-w-[120px]">
      {/* Badge row */}
      <div
        className={cn(
          "group flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors",
          badgeCls
        )}
      >
        <DollarSign className="h-3.5 w-3.5 shrink-0" />
        <span>
          {fmt(spentUsd)} / {fmt(localBudget)}
        </span>
        {pct > 0 && (
          <span className="opacity-60">({Math.min(pct, 999)}%)</span>
        )}
        {isOver && (
          <span className="font-semibold text-red-600 ml-0.5">Over!</span>
        )}
        {canManage && (
          <button
            onClick={startEdit}
            className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
            title="Edit budget"
          >
            <Pencil className="h-2.5 w-2.5" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {localBudget > 0 && (
        <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden mx-0.5">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(pct, 100)}%`,
              backgroundColor: barColor,
            }}
          />
        </div>
      )}
    </div>
  );
}

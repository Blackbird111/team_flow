"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Copy, Check, ExternalLink, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PortalSettingsProps {
  project: {
    id: string;
    name: string;
    clientName: string | null;
    clientPortalEnabled: boolean;
    clientPortalSlug: string | null;
  };
  canManage: boolean;
  appUrl: string;
}

export function PortalSettings({ project, canManage, appUrl }: PortalSettingsProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(project.clientPortalEnabled);
  const [slug, setSlug] = useState(project.clientPortalSlug);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  const portalUrl = slug ? `${appUrl}/portal/${slug}` : null;

  async function handleToggle() {
    setToggling(true);
    const res = await fetch(`/api/projects/${project.id}/portal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    setToggling(false);
    if (res.ok) {
      const data = await res.json();
      setEnabled(data.portal.clientPortalEnabled);
      setSlug(data.portal.clientPortalSlug);
      router.refresh();
    }
  }

  function handleCopy() {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Status card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
            enabled ? "bg-emerald-500/10" : "bg-muted"
          )}>
            {enabled
              ? <Globe className="h-5 w-5 text-emerald-500" />
              : <Lock className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div className="flex-1">
            <p className="font-semibold">Client Portal</p>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? "Active — clients can view project progress via the link below"
                : "Disabled — only team members can see this project"}
            </p>
          </div>
          {canManage && (
            <Button
              variant={enabled ? "outline" : "default"}
              size="sm"
              onClick={handleToggle}
              disabled={toggling}
              className="shrink-0 gap-1.5"
            >
              {toggling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : enabled ? (
                "Disable"
              ) : (
                <><Globe className="h-4 w-4" /> Enable</>
              )}
            </Button>
          )}
        </div>

        {/* Portal URL */}
        {enabled && portalUrl && (
          <div className="rounded-lg bg-muted px-4 py-3 flex items-center gap-3">
            <span className="text-sm text-muted-foreground truncate flex-1 font-mono">
              {portalUrl}
            </span>
            <button
              onClick={handleCopy}
              className="shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              title="Copy link"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </button>
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              title="Open portal"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>

      {/* What clients see */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
        <h3 className="font-semibold text-sm">What clients can see</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {[
            { yes: true,  label: "Project name and description" },
            { yes: true,  label: "Task list with statuses (open / in progress / done)" },
            { yes: true,  label: "Overall progress bar and completion %" },
            { yes: true,  label: "Deadline" },
            { yes: true,  label: "Team member count" },
            { yes: false, label: "Internal comments" },
            { yes: false, label: "Time logs and hourly rates" },
            { yes: false, label: "Budget details" },
          ].map(({ yes, label }) => (
            <li key={label} className="flex items-center gap-2">
              <span className={cn(
                "h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                yes ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"
              )}>
                {yes ? "✓" : "✗"}
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>

      {!canManage && (
        <p className="text-sm text-muted-foreground">
          Only project managers can enable or disable the client portal.
        </p>
      )}
    </div>
  );
}

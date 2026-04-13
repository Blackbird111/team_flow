"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CheckSquare, Clock, Users, Sparkles, Globe, Archive, Inbox, BarChart2 } from "lucide-react";

const tabs = [
  { label: "Tasks",     icon: CheckSquare, suffix: ""            },
  { label: "Dashboard", icon: BarChart2,   suffix: "/dashboard"  },
  { label: "Time",      icon: Clock,       suffix: "/time"       },
  { label: "Team",      icon: Users,       suffix: "/team"       },
  { label: "Requests",  icon: Inbox,       suffix: "/requests"   },
  { label: "AI",        icon: Sparkles,    suffix: "/ai"         },
  { label: "Portal",    icon: Globe,       suffix: "/portal"     },
  { label: "Archive",   icon: Archive,     suffix: "/archive"    },
];

export function ProjectTabBar({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/projects/${projectId}`;

  return (
    <div className="flex items-center gap-0 border-b border-slate-200 bg-white overflow-x-auto -mx-6 px-6">
      {tabs.map(({ label, icon: Icon, suffix }) => {
        const href = `${base}${suffix}`;
        const isActive = suffix === ""
          ? pathname === base
          : pathname.startsWith(href);
        return (
          <Link
            key={label}
            href={href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
              isActive
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}

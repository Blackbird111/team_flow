"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, Users, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Projects", icon: LayoutDashboard },
  { href: "/dashboard/members", label: "Members", icon: Users },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

function useUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch("/api/messages/unread", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setCount(data.count ?? 0);
        }
      } catch { /* ignore */ }
    }

    fetch_();
    const interval = setInterval(fetch_, 10_000);
    return () => clearInterval(interval);
  }, []);

  return count;
}

interface SidebarNavProps {
  mobile?: boolean;
}

export function SidebarNav({ mobile = false }: SidebarNavProps) {
  const pathname = usePathname();
  const unreadCount = useUnreadCount();

  if (mobile) {
    return (
      <>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          const isMessages = href === "/dashboard/messages";
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <div className="relative">
                <Icon className="h-4 w-4 shrink-0" />
                {isMessages && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[1rem] px-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              {label}
              {isMessages && unreadCount > 0 && (
                <span className="ml-auto h-5 min-w-[1.25rem] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <>
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(href);
        const isMessages = href === "/dashboard/messages";
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              isActive
                ? "bg-blue-600 text-white shadow-sm shadow-blue-700/30"
                : "text-white/60 hover:bg-white/8 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {isMessages && unreadCount > 0 && (
              <span className="h-5 min-w-[1.25rem] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}

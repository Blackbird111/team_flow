"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, LayoutDashboard, Users, MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard/my-tasks",  label: "My Tasks",  icon: CheckSquare },
  { href: "/dashboard",           label: "MyBoard",   icon: LayoutDashboard, exact: true },
  { href: "/dashboard/members",   label: "Members",   icon: Users },
  { href: "/dashboard/messages",  label: "Messages",  icon: MessageSquare },
  { href: "/settings",            label: "Settings",  icon: Settings },
];

function useUnreadCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch("/api/messages/unread", { cache: "no-store" });
        if (res.ok) setCount((await res.json()).count ?? 0);
      } catch { /* ignore */ }
    }
    fetch_();
    const id = setInterval(fetch_, 10_000);
    return () => clearInterval(id);
  }, []);
  return count;
}

export function TopNav() {
  const pathname = usePathname();
  const unread = useUnreadCount();

  return (
    <nav className="flex items-center gap-0.5 overflow-x-auto">
      {navItems.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(href + "/");
        const isMessages = href === "/dashboard/messages";

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              isActive
                ? "bg-blue-600 text-white shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/8"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
            {isMessages && unread > 0 && (
              <span className="ml-0.5 h-4 min-w-[1rem] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

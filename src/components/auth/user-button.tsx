"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import {
  LogOut,
  Settings,
  LayoutDashboard,
  CreditCard,
  User,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }
  if (email) return email[0]?.toUpperCase() ?? "U";
  return "U";
}

export function UserButton({ sidebarMode = false }: { sidebarMode?: boolean }) {
  const { data: session } = useSession();
  const user = session?.user;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/register">Get started</Link>
        </Button>
      </div>
    );
  }

  const subscriptionTier = (user as { subscriptionTier?: string }).subscriptionTier;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {sidebarMode ? (
          <button className="flex items-center gap-2.5 w-full rounded-lg px-2 py-2 outline-none hover:bg-white/8 transition-colors">
            <Avatar className="h-7 w-7 cursor-pointer shrink-0">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
              <AvatarFallback className="text-xs font-medium bg-blue-600 text-white">
                {getInitials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-white/90 truncate">{user.name ?? user.email}</p>
              {user.email && user.name && (
                <p className="text-[10px] text-white/40 truncate">{user.email}</p>
              )}
            </div>
          </button>
        ) : (
          <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
              <AvatarFallback className="text-xs font-medium bg-primary text-primary-foreground">
                {getInitials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            {user.name && (
              <p className="text-sm font-medium leading-none">{user.name}</p>
            )}
            {user.email && (
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user.email}
              </p>
            )}
            {subscriptionTier && (
              <p className="text-xs leading-none text-primary font-medium capitalize">
                {subscriptionTier} plan
              </p>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/my-tasks" className="cursor-pointer">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              My Tasks
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings#profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings#billing" className="cursor-pointer">
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings#password" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
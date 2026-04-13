"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { LogOut, Settings, User, CreditCard, CheckSquare } from "lucide-react";
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

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  }
  if (email) return email[0]?.toUpperCase() ?? "U";
  return "U";
}

interface NavUserButtonProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function NavUserButton({ name, email, image }: NavUserButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/30">
          <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-white/10 hover:ring-white/30 transition-all">
            <AvatarImage src={image ?? undefined} alt={name ?? "User"} />
            <AvatarFallback className="text-xs font-medium bg-blue-600 text-white">
              {getInitials(name, email)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            {name && <p className="text-sm font-medium leading-none">{name}</p>}
            {email && <p className="text-xs leading-none text-muted-foreground truncate">{email}</p>}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/my-tasks" className="cursor-pointer">
              <CheckSquare className="mr-2 h-4 w-4" />
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
            <Link href="/settings" className="cursor-pointer">
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

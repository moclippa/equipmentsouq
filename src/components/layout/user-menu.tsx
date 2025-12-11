"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  User,
  Settings,
  Building2,
  Package,
  MessageCircle,
  LogOut,
  ChevronDown,
} from "lucide-react";

interface UserMenuProps {
  user: {
    fullName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    role?: string | null;
  };
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function UserMenu({ user }: UserMenuProps) {
  const isOwner = user.role === "OWNER" || user.role === "ADMIN";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatarUrl || undefined} alt={user.fullName || "User"} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {getInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline-block text-sm font-medium max-w-[150px] truncate">
            {user.fullName}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.fullName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="cursor-pointer">
              <User className="me-2 h-4 w-4" />
              Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="me-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          {isOwner && (
            <DropdownMenuItem asChild>
              <Link href="/settings/business" className="cursor-pointer">
                <Building2 className="me-2 h-4 w-4" />
                Business Profile
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/my-listings" className="cursor-pointer">
              <Package className="me-2 h-4 w-4" />
              My Listings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/my-leads" className="cursor-pointer">
              <MessageCircle className="me-2 h-4 w-4" />
              My Leads
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="me-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

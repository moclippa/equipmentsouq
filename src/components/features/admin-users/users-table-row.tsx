import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserCheck, UserX, Eye, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { UserItem } from "./types";
import { getRoleBadgeVariant, getStatusBadge } from "./utils";

interface UsersTableRowProps {
  user: UserItem;
}

export function UsersTableRow({ user }: UsersTableRowProps) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/50">
      <td className="py-3 px-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs font-medium">
              {user.fullName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium">{user.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {user.country === "SA" ? "🇸🇦" : "🇧🇭"} {user.country}
            </p>
          </div>
        </div>
      </td>
      <td className="py-3 px-2">
        <div className="space-y-1 text-sm">
          {user.email && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Mail className="w-3 h-3" />
              <span className="truncate max-w-[150px]">{user.email}</span>
            </div>
          )}
          {user.phone && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Phone className="w-3 h-3" />
              <span>{user.phone}</span>
            </div>
          )}
        </div>
      </td>
      <td className="py-3 px-2">
        <Badge variant={getRoleBadgeVariant(user.role)}>
          {user.role}
        </Badge>
      </td>
      <td className="py-3 px-2">
        {user.businessProfile ? (
          <div className="text-sm">
            <p className="font-medium">{user.businessProfile.companyNameEn}</p>
            <p className="text-xs text-muted-foreground">
              {user.businessProfile.businessType}
              {user.businessProfile.crVerificationStatus === "VERIFIED" && (
                <span className="text-green-600 ms-1">✓ Verified</span>
              )}
            </p>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-3 px-2">
        <span className="text-sm">{user._count.equipment}</span>
      </td>
      <td className="py-3 px-2">
        {getStatusBadge(user)}
      </td>
      <td className="py-3 px-2 text-sm text-muted-foreground">
        {formatDistanceToNow(user.createdAt, { addSuffix: true })}
      </td>
      <td className="py-3 px-2 text-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/users/${user.id}`}>
                <Eye className="w-4 h-4 me-2" />
                View Details
              </Link>
            </DropdownMenuItem>
            {!user.isSuspended ? (
              <DropdownMenuItem className="text-destructive">
                <UserX className="w-4 h-4 me-2" />
                Suspend User
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem>
                <UserCheck className="w-4 h-4 me-2" />
                Reactivate User
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

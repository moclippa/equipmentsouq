import { Badge } from "@/components/ui/badge";
import { UserRole } from "@prisma/client";

export function getRoleBadgeVariant(role: UserRole) {
  switch (role) {
    case "ADMIN":
      return "destructive";
    case "OWNER":
      return "default";
    case "RENTER":
      return "secondary";
    default:
      return "outline";
  }
}

export function getStatusBadge(user: { isActive: boolean; isSuspended: boolean }) {
  if (user.isSuspended) {
    return <Badge variant="destructive">Suspended</Badge>;
  }
  if (!user.isActive) {
    return <Badge variant="outline">Inactive</Badge>;
  }
  return <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>;
}

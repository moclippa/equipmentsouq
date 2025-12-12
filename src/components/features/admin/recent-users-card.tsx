import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface RecentUser {
  id: string;
  fullName: string;
  role: string;
  country: string | null;
  createdAt: Date;
}

interface RecentUsersCardProps {
  users: RecentUser[];
}

export function RecentUsersCard({ users }: RecentUsersCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Users</CardTitle>
        <CardDescription>Latest registrations</CardDescription>
      </CardHeader>
      <CardContent>
        {users.length > 0 ? (
          <div className="space-y-3">
            {users.map((user) => (
              <Link
                key={user.id}
                href={`/admin/users/${user.id}`}
                className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {user.fullName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.country === "SA" ? "🇸🇦" : "🇧🇭"} {user.role}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(user.createdAt, "MMM d")}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No users yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}

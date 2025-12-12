import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserItem, SearchParams } from "./types";
import { UsersTableRow } from "./users-table-row";

interface UsersTableProps {
  users: UserItem[];
  total: number;
  page: number;
  totalPages: number;
  params: SearchParams;
  itemsPerPage: number;
}

export function UsersTable({
  users,
  total,
  page,
  totalPages,
  params,
  itemsPerPage,
}: UsersTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users ({total})</CardTitle>
        <CardDescription>
          Page {page} of {totalPages}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-sm text-muted-foreground">
                <th className="text-start py-3 px-2 font-medium">User</th>
                <th className="text-start py-3 px-2 font-medium">Contact</th>
                <th className="text-start py-3 px-2 font-medium">Role</th>
                <th className="text-start py-3 px-2 font-medium">Business</th>
                <th className="text-start py-3 px-2 font-medium">Listings</th>
                <th className="text-start py-3 px-2 font-medium">Status</th>
                <th className="text-start py-3 px-2 font-medium">Joined</th>
                <th className="text-end py-3 px-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UsersTableRow key={user.id} user={user} />
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    No users found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * itemsPerPage + 1} to{" "}
              {Math.min(page * itemsPerPage, total)} of {total} users
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={{
                      pathname: "/admin/users",
                      query: { ...params, page: page - 1 },
                    }}
                  >
                    Previous
                  </Link>
                </Button>
              )}
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={{
                      pathname: "/admin/users",
                      query: { ...params, page: page + 1 },
                    }}
                  >
                    Next
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

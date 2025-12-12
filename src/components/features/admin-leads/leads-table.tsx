import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LeadItem, SearchParams } from "./types";
import { LeadsTableRow } from "./leads-table-row";

interface LeadsTableProps {
  leads: LeadItem[];
  total: number;
  page: number;
  totalPages: number;
  params: SearchParams;
  itemsPerPage: number;
}

export function LeadsTable({
  leads,
  total,
  page,
  totalPages,
  params,
  itemsPerPage,
}: LeadsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Leads ({total})</CardTitle>
        <CardDescription>
          Page {page} of {totalPages}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-sm text-muted-foreground">
                <th className="text-start py-3 px-2 font-medium">Lead Contact</th>
                <th className="text-start py-3 px-2 font-medium">Equipment</th>
                <th className="text-start py-3 px-2 font-medium">Owner</th>
                <th className="text-start py-3 px-2 font-medium">Interest</th>
                <th className="text-start py-3 px-2 font-medium">Status</th>
                <th className="text-start py-3 px-2 font-medium">Message</th>
                <th className="text-start py-3 px-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <LeadsTableRow key={lead.id} lead={lead} />
              ))}

              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No leads found matching your criteria
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
              {Math.min(page * itemsPerPage, total)} of {total} leads
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={{
                      pathname: "/admin/leads",
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
                      pathname: "/admin/leads",
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

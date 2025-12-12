import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EquipmentItem, SearchParams } from "./types";
import { EquipmentTableRow } from "./equipment-table-row";

interface EquipmentTableProps {
  equipment: EquipmentItem[];
  total: number;
  page: number;
  totalPages: number;
  params: SearchParams;
  itemsPerPage: number;
}

export function EquipmentTable({
  equipment,
  total,
  page,
  totalPages,
  params,
  itemsPerPage,
}: EquipmentTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipment Listings ({total})</CardTitle>
        <CardDescription>
          Page {page} of {totalPages}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-sm text-muted-foreground">
                <th className="text-start py-3 px-2 font-medium">Equipment</th>
                <th className="text-start py-3 px-2 font-medium">Owner</th>
                <th className="text-start py-3 px-2 font-medium">Type</th>
                <th className="text-start py-3 px-2 font-medium">Price</th>
                <th className="text-start py-3 px-2 font-medium">Location</th>
                <th className="text-start py-3 px-2 font-medium">Status</th>
                <th className="text-start py-3 px-2 font-medium">Leads</th>
                <th className="text-start py-3 px-2 font-medium">Created</th>
                <th className="text-end py-3 px-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {equipment.map((item) => (
                <EquipmentTableRow key={item.id} item={item} />
              ))}

              {equipment.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    No equipment found matching your criteria
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
              {Math.min(page * itemsPerPage, total)} of {total} listings
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={{
                      pathname: "/admin/equipment",
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
                      pathname: "/admin/equipment",
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

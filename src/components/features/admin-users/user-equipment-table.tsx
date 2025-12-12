import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { UserEquipment } from "./user-detail-types";

interface UserEquipmentTableProps {
  equipment: UserEquipment[];
  totalCount: number;
  userId: string;
}

export function UserEquipmentTable({ equipment, totalCount, userId }: UserEquipmentTableProps) {
  if (equipment.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Equipment Listings</CardTitle>
        <CardDescription>
          Latest {equipment.length} of {totalCount} listings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-sm text-muted-foreground">
                <th className="text-start py-2 px-2 font-medium">Equipment</th>
                <th className="text-start py-2 px-2 font-medium">Category</th>
                <th className="text-start py-2 px-2 font-medium">Status</th>
                <th className="text-start py-2 px-2 font-medium">Leads</th>
                <th className="text-start py-2 px-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {equipment.map((eq) => (
                <tr key={eq.id} className="border-b last:border-0">
                  <td className="py-2 px-2">
                    <Link
                      href={`/admin/equipment/${eq.id}`}
                      className="font-medium hover:underline"
                    >
                      {eq.titleEn}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {eq.make} {eq.model} {eq.year}
                    </p>
                  </td>
                  <td className="py-2 px-2 text-sm">{eq.category.nameEn}</td>
                  <td className="py-2 px-2">
                    <Badge variant={eq.status === "ACTIVE" ? "default" : "secondary"}>
                      {eq.status}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-sm">{eq._count.leads}</td>
                  <td className="py-2 px-2 text-sm text-muted-foreground">
                    {format(eq.createdAt, "PP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalCount > 5 && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/equipment?ownerId=${userId}`}>
                View All {totalCount} Listings
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

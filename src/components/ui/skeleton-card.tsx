import { Card, CardContent } from "@/components/ui/card";

export function EquipmentCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-[4/3] bg-muted animate-pulse" />
      <CardContent className="p-4 space-y-3">
        <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
        <div className="h-5 bg-muted rounded animate-pulse w-full" />
        <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
        <div className="flex justify-between mt-4">
          <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
          <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
        </div>
      </CardContent>
    </Card>
  );
}

export function EquipmentGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <EquipmentCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-muted rounded animate-pulse w-24" />
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-8 bg-muted rounded animate-pulse w-16 mb-2" />
        <div className="h-3 bg-muted rounded animate-pulse w-20" />
      </CardContent>
    </Card>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-4 px-2">
          <div className="h-4 bg-muted rounded animate-pulse w-full" />
        </td>
      ))}
    </tr>
  );
}

export function ProfileCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-muted rounded animate-pulse w-32" />
            <div className="h-4 bg-muted rounded animate-pulse w-24" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded animate-pulse w-full" />
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
        </div>
      </CardContent>
    </Card>
  );
}

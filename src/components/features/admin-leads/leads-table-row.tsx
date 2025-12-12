import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { Phone, Mail, Package, User } from "lucide-react";
import { LeadItem } from "./types";
import { getStatusBadge, getInterestBadge } from "./utils";

interface LeadsTableRowProps {
  lead: LeadItem;
}

export function LeadsTableRow({ lead }: LeadsTableRowProps) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/50">
      <td className="py-3 px-2">
        <div>
          <p className="font-medium">{lead.name}</p>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Phone className="w-3 h-3" />
            {lead.phone}
          </div>
          {lead.email && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Mail className="w-3 h-3" />
              <span className="truncate max-w-[150px]">{lead.email}</span>
            </div>
          )}
        </div>
      </td>
      <td className="py-3 px-2">
        <Link
          href={`/admin/equipment/${lead.equipment.id}`}
          className="flex items-center gap-1 text-sm hover:underline"
        >
          <Package className="w-3 h-3" />
          <span className="line-clamp-1">{lead.equipment.titleEn}</span>
        </Link>
        <p className="text-xs text-muted-foreground">
          {lead.equipment.make} {lead.equipment.model}
        </p>
      </td>
      <td className="py-3 px-2">
        <Link
          href={`/admin/users/${lead.equipment.owner.id}`}
          className="flex items-center gap-1 text-sm hover:underline"
        >
          <User className="w-3 h-3" />
          {lead.equipment.owner.fullName}
        </Link>
        <p className="text-xs text-muted-foreground">
          {lead.equipment.owner.phone}
        </p>
      </td>
      <td className="py-3 px-2">
        {getInterestBadge(lead.interestedIn)}
      </td>
      <td className="py-3 px-2">
        {getStatusBadge(lead.status)}
        {lead.ownerViewedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Viewed {formatDistanceToNow(lead.ownerViewedAt, { addSuffix: true })}
          </p>
        )}
      </td>
      <td className="py-3 px-2">
        {lead.message ? (
          <p className="text-sm text-muted-foreground line-clamp-2 max-w-[200px]">
            {lead.message}
          </p>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-3 px-2 text-sm text-muted-foreground">
        <p>{format(lead.createdAt, "PP")}</p>
        <p className="text-xs">{format(lead.createdAt, "p")}</p>
      </td>
    </tr>
  );
}

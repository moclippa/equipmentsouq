"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  MessageCircle,
  Mail,
  Eye,
  Clock,
  CheckCircle,
  User,
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  message?: string | null;
  interestedIn: string;
  status: "NEW" | "VIEWED" | "CONTACTED" | "CONVERTED" | "CLOSED";
  createdAt: string;
  ownerViewedAt?: string | null;
  ownerContactedAt?: string | null;
  equipment: {
    id: string;
    titleEn: string;
    make: string;
    model: string;
    images: { url: string }[];
  };
}

interface LeadCardProps {
  lead: Lead;
  onStatusUpdate?: (leadId: string, status: string) => void;
}

export function LeadCard({ lead, onStatusUpdate }: LeadCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const statusColors = {
    NEW: "bg-blue-100 text-blue-800",
    VIEWED: "bg-gray-100 text-gray-800",
    CONTACTED: "bg-yellow-100 text-yellow-800",
    CONVERTED: "bg-green-100 text-green-800",
    CLOSED: "bg-red-100 text-red-800",
  };

  const statusLabels = {
    NEW: "New",
    VIEWED: "Viewed",
    CONTACTED: "Contacted",
    CONVERTED: "Converted",
    CLOSED: "Closed",
  };

  const handleMarkContacted = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONTACTED" }),
      });

      if (response.ok && onStatusUpdate) {
        onStatusUpdate(lead.id, "CONTACTED");
      }
    } catch (error) {
      console.error("Failed to update lead status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getWhatsAppLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hi ${lead.name}, I saw your inquiry about my ${lead.equipment.titleEn} on EquipmentSouq.`
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  return (
    <Card className={lead.status === "NEW" ? "border-blue-300 bg-blue-50/30" : ""}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Equipment thumbnail */}
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
            {lead.equipment.images[0] ? (
              <img
                src={lead.equipment.images[0].url}
                alt={lead.equipment.titleEn}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No image
              </div>
            )}
          </div>

          {/* Lead details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium truncate">{lead.name}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {lead.equipment.make} {lead.equipment.model}
                </p>
              </div>
              <Badge className={statusColors[lead.status]}>
                {statusLabels[lead.status]}
              </Badge>
            </div>

            {/* Interest type */}
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Interested in:</span>
              <Badge variant="outline">
                {lead.interestedIn === "rent"
                  ? "Renting"
                  : lead.interestedIn === "buy"
                  ? "Buying"
                  : "Both"}
              </Badge>
            </div>

            {/* Message preview */}
            {lead.message && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                "{lead.message}"
              </p>
            )}

            {/* Timestamp */}
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                {formatDistanceToNow(new Date(lead.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Contact actions */}
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
          <a
            href={`tel:${lead.phone}`}
            onClick={handleMarkContacted}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
          >
            <Phone className="w-4 h-4" />
            <span>{lead.phone}</span>
          </a>

          <a
            href={getWhatsAppLink(lead.phone)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleMarkContacted}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>

          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              onClick={handleMarkContacted}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-muted transition-colors text-sm"
            >
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </a>
          )}

          {lead.status !== "CONTACTED" && lead.status !== "CONVERTED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkContacted}
              disabled={isUpdating}
              className="ms-auto"
            >
              <CheckCircle className="w-4 h-4 me-1" />
              Mark Contacted
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

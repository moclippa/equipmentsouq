"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingRequest {
  id: string;
  status: "PENDING" | "CONFIRMED" | "DECLINED" | "EXPIRED" | "CANCELLED";
  startDate: string;
  endDate: string;
  renterName: string;
  renterPhone: string;
  renterEmail: string | null;
  renterMessage: string | null;
  ownerResponse: string | null;
  expiresAt: string;
  createdAt: string;
  respondedAt: string | null;
  equipment: {
    id: string;
    titleEn: string;
    titleAr: string | null;
    rentalPrice: string | null;
    rentalPriceUnit: string | null;
    currency: string;
    images: { url: string; thumbnailUrl: string | null }[];
  };
}

interface BookingRequestCardProps {
  request: BookingRequest;
  role: "owner" | "renter";
  onUpdate?: () => void;
}

const statusConfig = {
  PENDING: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
  },
  DECLINED: {
    label: "Declined",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
  },
  EXPIRED: {
    label: "Expired",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: AlertCircle,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: XCircle,
  },
};

export function BookingRequestCard({
  request,
  role,
  onUpdate,
}: BookingRequestCardProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeclineOpen, setIsDeclineOpen] = useState(false);
  const [response, setResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusInfo = statusConfig[request.status];
  const StatusIcon = statusInfo.icon;

  const isPending = request.status === "PENDING";
  const expiresIn = new Date(request.expiresAt);
  const isExpiringSoon =
    isPending && expiresIn.getTime() - Date.now() < 12 * 60 * 60 * 1000; // 12 hours

  const handleAction = async (action: "confirm" | "decline" | "cancel") => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/booking-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, response: response.trim() || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} request`);
      }

      setIsConfirmOpen(false);
      setIsDeclineOpen(false);
      setResponse("");
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const image = request.equipment.images[0];

  return (
    <Card className={cn(isPending && isExpiringSoon && "border-yellow-300")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {image ? (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={image.thumbnailUrl || image.url}
                  alt={request.equipment.titleEn}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <CalendarDays className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <CardTitle className="text-base truncate">
                {request.equipment.titleEn}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <CalendarDays className="w-3.5 h-3.5" />
                {format(new Date(request.startDate), "MMM d")} -{" "}
                {format(new Date(request.endDate), "MMM d, yyyy")}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={cn("flex-shrink-0", statusInfo.color)}>
            <StatusIcon className="w-3 h-3 me-1" />
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Renter Info (for owner view) */}
        {role === "owner" && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{request.renterName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <a href={`tel:${request.renterPhone}`} className="text-primary hover:underline">
                {request.renterPhone}
              </a>
            </div>
            {request.renterEmail && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${request.renterEmail}`} className="text-primary hover:underline">
                  {request.renterEmail}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Renter's Message */}
        {request.renterMessage && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquare className="w-3.5 h-3.5" />
              {role === "owner" ? "Renter's Message" : "Your Message"}
            </div>
            <p className="text-sm bg-muted/30 p-2 rounded-lg">
              {request.renterMessage}
            </p>
          </div>
        )}

        {/* Owner's Response */}
        {request.ownerResponse && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquare className="w-3.5 h-3.5" />
              Owner&apos;s Response
            </div>
            <p className="text-sm bg-muted/30 p-2 rounded-lg">
              {request.ownerResponse}
            </p>
          </div>
        )}

        {/* Expiry Warning for Pending */}
        {isPending && (
          <div
            className={cn(
              "flex items-center gap-2 text-sm rounded-lg p-2",
              isExpiringSoon
                ? "bg-yellow-50 text-yellow-700"
                : "bg-muted/50 text-muted-foreground"
            )}
          >
            <Clock className="w-4 h-4" />
            <span>
              {isExpiringSoon ? "Expires soon: " : "Expires: "}
              {formatDistanceToNow(expiresIn, { addSuffix: true })}
            </span>
          </div>
        )}

        {/* Timestamps */}
        <div className="text-xs text-muted-foreground">
          Requested {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
          {request.respondedAt &&
            ` • Responded ${formatDistanceToNow(new Date(request.respondedAt), { addSuffix: true })}`}
        </div>

        {/* Error */}
        {error && (
          <div className="p-2 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* Actions (for owner) */}
        {role === "owner" && isPending && (
          <div className="flex gap-2 pt-2">
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1">
                  <CheckCircle className="w-4 h-4 me-2" />
                  Confirm
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Booking Request</DialogTitle>
                  <DialogDescription>
                    This will notify the renter that their booking is confirmed and share your
                    contact details with them.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p className="font-medium">{request.renterName}</p>
                    <p className="text-muted-foreground">
                      {format(new Date(request.startDate), "MMM d")} -{" "}
                      {format(new Date(request.endDate), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-response">
                      Message to renter (optional)
                    </Label>
                    <Textarea
                      id="confirm-response"
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="Any additional instructions or details..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => handleAction("confirm")} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 me-2" />
                    )}
                    Confirm Booking
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isDeclineOpen} onOpenChange={setIsDeclineOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1">
                  <XCircle className="w-4 h-4 me-2" />
                  Decline
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Decline Booking Request</DialogTitle>
                  <DialogDescription>
                    Let the renter know why you can&apos;t accept their booking.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="decline-response">
                      Reason (optional, will be shared with renter)
                    </Label>
                    <Textarea
                      id="decline-response"
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="e.g., Equipment is already booked, different dates available..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeclineOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleAction("decline")}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4 me-2" />
                    )}
                    Decline Request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Cancel Action (for renter with pending request) */}
        {role === "renter" && isPending && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleAction("cancel")}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4 me-2" />
            )}
            Cancel Request
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

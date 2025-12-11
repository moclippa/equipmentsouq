"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingRequestCard } from "@/components/features/booking/booking-request-card";
import {
  CalendarClock,
  Loader2,
  Inbox,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

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

interface RequestsResponse {
  bookingRequests: BookingRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function BookingRequestsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const role = searchParams.get("role") || "owner";
  const statusFilter = searchParams.get("status") || "all";

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("role", role);
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await fetch(`/api/booking-requests?${params.toString()}`);
      const data: RequestsResponse = await res.json();

      if (!res.ok) {
        throw new Error((data as unknown as { error: string }).error || "Failed to fetch requests");
      }

      setRequests(data.bookingRequests);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [role, statusFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    fetchRequests();
  }, [session, sessionStatus, router, fetchRequests]);

  const handleRoleChange = (newRole: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("role", newRole);
    params.delete("status");
    router.push(`/dashboard/booking-requests?${params.toString()}`);
  };

  const handleStatusChange = (newStatus: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newStatus === "all") {
      params.delete("status");
    } else {
      params.set("status", newStatus);
    }
    router.push(`/dashboard/booking-requests?${params.toString()}`);
  };

  // Count by status
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  if (sessionStatus === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarClock className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Booking Requests</h1>
            <p className="text-muted-foreground">
              {role === "owner"
                ? "Manage requests for your equipment"
                : "Track your booking requests"}
            </p>
          </div>
        </div>

        {pendingCount > 0 && role === "owner" && (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3.5 h-3.5 me-1" />
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {/* View Toggle (Owner vs Renter) */}
      <Tabs value={role} onValueChange={handleRoleChange} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="owner">Received Requests</TabsTrigger>
          <TabsTrigger value="renter">My Requests</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Status Filter */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="PENDING">
              <span className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-yellow-600" />
                Pending
              </span>
            </SelectItem>
            <SelectItem value="CONFIRMED">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                Confirmed
              </span>
            </SelectItem>
            <SelectItem value="DECLINED">
              <span className="flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-red-600" />
                Declined
              </span>
            </SelectItem>
            <SelectItem value="EXPIRED">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-gray-600" />
                Expired
              </span>
            </SelectItem>
            <SelectItem value="CANCELLED">
              <span className="flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-gray-600" />
                Cancelled
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">
          {pagination.total} request{pagination.total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No booking requests</h3>
          <p className="text-muted-foreground mt-1">
            {role === "owner"
              ? "You haven't received any booking requests yet."
              : "You haven't made any booking requests yet."}
          </p>
          {role === "renter" && (
            <Button className="mt-4" onClick={() => router.push("/search")}>
              Browse Equipment
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {requests.map((request) => (
            <BookingRequestCard
              key={request.id}
              request={request}
              role={role as "owner" | "renter"}
              onUpdate={fetchRequests}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() =>
              setPagination((p) => ({ ...p, page: p.page - 1 }))
            }
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() =>
              setPagination((p) => ({ ...p, page: p.page + 1 }))
            }
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

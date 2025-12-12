"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadCard } from "@/components/features/leads/lead-card";
import {
  Loader2,
  Inbox,
  Eye,
  Phone,
  CheckCircle,
  XCircle,
  RefreshCw,
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

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function MyLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async (status?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (status && status !== "all") {
        params.set("status", status.toUpperCase());
      }

      const response = await fetch(`/api/leads?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load leads");
      }

      setLeads(data.leads);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
      setError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads(activeTab);
  }, [activeTab, fetchLeads]);

  const handleStatusUpdate = (leadId: string, newStatus: string) => {
    setLeads((prevLeads) =>
      prevLeads.map((lead) =>
        lead.id === leadId ? { ...lead, status: newStatus as Lead["status"] } : lead
      )
    );
  };

  const statusCounts = {
    all: leads.length,
    new: leads.filter((l) => l.status === "NEW").length,
    viewed: leads.filter((l) => l.status === "VIEWED").length,
    contacted: leads.filter((l) => l.status === "CONTACTED").length,
    converted: leads.filter((l) => l.status === "CONVERTED").length,
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Leads</h1>
          <p className="text-muted-foreground">
            People interested in your equipment
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchLeads(activeTab)}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 me-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Inbox className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{statusCounts.new}</p>
            <p className="text-sm text-muted-foreground">New Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="w-6 h-6 mx-auto mb-2 text-gray-500" />
            <p className="text-2xl font-bold">{statusCounts.viewed}</p>
            <p className="text-sm text-muted-foreground">Viewed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Phone className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{statusCounts.contacted}</p>
            <p className="text-sm text-muted-foreground">Contacted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{statusCounts.converted}</p>
            <p className="text-sm text-muted-foreground">Converted</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ms-2">
              {pagination?.total || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="new">
            New
            {statusCounts.new > 0 && (
              <Badge className="ms-2 bg-blue-500">{statusCounts.new}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="contacted">Contacted</TabsTrigger>
          <TabsTrigger value="converted">Converted</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Loading leads...</span>
            </div>
          ) : error ? (
            <Card>
              <CardContent className="py-12 text-center">
                <XCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
                <p className="text-muted-foreground">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => fetchLeads(activeTab)}
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : leads.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No leads yet</h3>
                <p className="text-muted-foreground mb-4">
                  When someone contacts you about your listings, they&apos;ll appear here.
                </p>
                <Button onClick={() => router.push("/equipment/new")}>
                  Create a Listing
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onStatusUpdate={handleStatusUpdate}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            disabled={pagination.page === 1}
            onClick={() => {
              // TODO: Implement pagination
            }}
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => {
              // TODO: Implement pagination
            }}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

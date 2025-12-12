/**
 * Admin Monitoring Dashboard API
 *
 * Returns aggregated performance metrics, error counts, and system health data
 * for the admin monitoring dashboard.
 *
 * This endpoint requires ADMIN role authentication.
 *
 * @route GET /api/admin/monitoring
 * @query period - Time period: "1h" | "24h" | "7d" | "30d" (default: "24h")
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAIUsageStats,
  getAPIPerformanceStats,
} from "@/lib/monitoring";

// =============================================================================
// TYPES
// =============================================================================

interface MonitoringResponse {
  period: {
    start: string;
    end: string;
    label: string;
  };
  overview: {
    activeUsers: number;
    totalRequests: number;
    errorRate: number;
    avgResponseTime: number;
  };
  aiUsage: {
    totalCost: number;
    totalRequests: number;
    successRate: number;
    avgLatency: number;
    byProvider: Record<string, { cost: number; requests: number }>;
    byService: Record<string, { cost: number; requests: number }>;
  };
  apiPerformance: {
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    slowRequestRate: number;
    byEndpoint: Record<
      string,
      { requests: number; avgTime: number; errorRate: number }
    >;
  };
  webVitals: {
    LCP: { avg: number; p75: number; goodRate: number };
    FID: { avg: number; p75: number; goodRate: number };
    INP: { avg: number; p75: number; goodRate: number };
    CLS: { avg: number; p75: number; goodRate: number };
    TTFB: { avg: number; p75: number; goodRate: number };
    FCP: { avg: number; p75: number; goodRate: number };
  };
  database: {
    connectionPoolUsage: number;
    avgQueryTime: number;
    slowQueries: number;
  };
  systemHealth: {
    status: "healthy" | "degraded" | "unhealthy";
    services: Array<{
      name: string;
      status: "up" | "degraded" | "down";
      latency: number;
    }>;
  };
  recentErrors: Array<{
    id: string;
    message: string;
    count: number;
    lastOccurred: string;
    severity: "low" | "medium" | "high" | "critical";
  }>;
  trends: {
    requests: number[];
    errors: number[];
    responseTime: number[];
    labels: string[];
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getPeriodDates(period: string): { start: Date; end: Date; label: string } {
  const end = new Date();
  let start: Date;
  let label: string;

  switch (period) {
    case "1h":
      start = new Date(end.getTime() - 60 * 60 * 1000);
      label = "Last 1 hour";
      break;
    case "7d":
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      label = "Last 7 days";
      break;
    case "30d":
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      label = "Last 30 days";
      break;
    case "24h":
    default:
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      label = "Last 24 hours";
      break;
  }

  return { start, end, label };
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function getActiveUsers(startDate: Date, endDate: Date): Promise<number> {
  const result = await prisma.analyticsEvent.groupBy({
    by: ["userId"],
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      userId: {
        not: null,
      },
    },
  });

  return result.length;
}

async function getWebVitalsStats(
  startDate: Date,
  endDate: Date
): Promise<MonitoringResponse["webVitals"]> {
  const vitals: Array<"LCP" | "FID" | "INP" | "CLS" | "TTFB" | "FCP"> = [
    "LCP",
    "FID",
    "INP",
    "CLS",
    "TTFB",
    "FCP",
  ];

  const thresholds = {
    LCP: 2500,
    FID: 100,
    INP: 200,
    CLS: 0.1,
    TTFB: 800,
    FCP: 1800,
  };

  const result = {} as MonitoringResponse["webVitals"];

  for (const vital of vitals) {
    const events = await prisma.analyticsEvent.findMany({
      where: {
        eventType: `web_vital_${vital.toLowerCase()}`,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        data: true,
      },
    });

    const values = events.map((e) => {
      const data = e.data as { value: number };
      return data.value;
    });

    if (values.length === 0) {
      result[vital] = { avg: 0, p75: 0, goodRate: 100 };
    } else {
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      const p75 = calculatePercentile(values, 75);
      const goodCount = values.filter((v) => v <= thresholds[vital]).length;
      const goodRate = (goodCount / values.length) * 100;

      result[vital] = { avg, p75, goodRate };
    }
  }

  return result;
}

async function getRecentErrors(
  startDate: Date,
  endDate: Date
): Promise<MonitoringResponse["recentErrors"]> {
  // Get error events from analytics
  const errorEvents = await prisma.analyticsEvent.findMany({
    where: {
      eventType: {
        contains: "error",
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  // Group errors by message
  const errorGroups = new Map<
    string,
    { count: number; lastOccurred: Date; severity: string }
  >();

  for (const event of errorEvents) {
    const data = event.data as { message?: string; severity?: string };
    const message = data.message || "Unknown error";

    if (errorGroups.has(message)) {
      const group = errorGroups.get(message)!;
      group.count++;
      if (event.createdAt > group.lastOccurred) {
        group.lastOccurred = event.createdAt;
      }
    } else {
      errorGroups.set(message, {
        count: 1,
        lastOccurred: event.createdAt,
        severity: data.severity || "medium",
      });
    }
  }

  // Convert to array and sort by count
  return Array.from(errorGroups.entries())
    .map(([message, data], index) => ({
      id: `err-${index}`,
      message,
      count: data.count,
      lastOccurred: data.lastOccurred.toISOString(),
      severity: data.severity as MonitoringResponse["recentErrors"][0]["severity"],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function getTrendLabels(period: string, bucketCount: number): string[] {
  const labels: string[] = [];

  switch (period) {
    case "1h":
      for (let i = bucketCount - 1; i >= 0; i--) {
        labels.push(`${i * 5}m ago`);
      }
      break;
    case "24h":
      for (let i = bucketCount - 1; i >= 0; i--) {
        labels.push(`${i}h ago`);
      }
      break;
    case "7d":
    case "30d":
      for (let i = bucketCount - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(
          date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        );
      }
      break;
  }

  return labels;
}

async function getTrends(
  startDate: Date,
  endDate: Date,
  period: string
): Promise<MonitoringResponse["trends"]> {
  // Determine bucket size and count
  let bucketCount: number;
  let bucketMs: number;

  switch (period) {
    case "1h":
      bucketCount = 12; // 5-minute buckets
      bucketMs = 5 * 60 * 1000;
      break;
    case "7d":
      bucketCount = 7; // Daily buckets
      bucketMs = 24 * 60 * 60 * 1000;
      break;
    case "30d":
      bucketCount = 30; // Daily buckets
      bucketMs = 24 * 60 * 60 * 1000;
      break;
    case "24h":
    default:
      bucketCount = 24; // Hourly buckets
      bucketMs = 60 * 60 * 1000;
      break;
  }

  // Initialize buckets
  const requests: number[] = new Array(bucketCount).fill(0);
  const errors: number[] = new Array(bucketCount).fill(0);
  const responseTimes: number[][] = new Array(bucketCount)
    .fill(null)
    .map(() => []);

  // Get API response events
  const events = await prisma.analyticsEvent.findMany({
    where: {
      eventType: "api_response",
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      data: true,
      createdAt: true,
    },
  });

  // Bucket the events
  for (const event of events) {
    const bucketIndex = Math.floor(
      (event.createdAt.getTime() - startDate.getTime()) / bucketMs
    );

    if (bucketIndex >= 0 && bucketIndex < bucketCount) {
      const data = event.data as { statusCode: number; durationMs: number };
      requests[bucketIndex]++;
      if (data.statusCode >= 400) {
        errors[bucketIndex]++;
      }
      responseTimes[bucketIndex].push(data.durationMs);
    }
  }

  // Calculate average response times per bucket
  const avgResponseTimes = responseTimes.map((times) =>
    times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
  );

  return {
    requests,
    errors,
    responseTime: avgResponseTimes,
    labels: getTrendLabels(period, bucketCount),
  };
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get time period from query
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "24h";

    // Get date range
    const { start, end, label } = getPeriodDates(period);

    // Fetch all metrics in parallel
    const [
      activeUsers,
      aiUsage,
      apiPerformance,
      webVitals,
      recentErrors,
      trends,
    ] = await Promise.all([
      getActiveUsers(start, end),
      getAIUsageStats(start, end),
      getAPIPerformanceStats(start, end),
      getWebVitalsStats(start, end),
      getRecentErrors(start, end),
      getTrends(start, end, period),
    ]);

    // Determine system health based on metrics
    const systemHealth = determineSystemHealth(apiPerformance, aiUsage, webVitals);

    // Build response
    const response: MonitoringResponse = {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        label,
      },
      overview: {
        activeUsers,
        totalRequests: apiPerformance.totalRequests,
        errorRate: apiPerformance.errorRate,
        avgResponseTime: apiPerformance.avgResponseTime,
      },
      aiUsage,
      apiPerformance,
      webVitals,
      database: {
        // These would come from actual database monitoring
        // For now, return placeholders
        connectionPoolUsage: 0,
        avgQueryTime: 0,
        slowQueries: 0,
      },
      systemHealth,
      recentErrors,
      trends,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Monitoring API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch monitoring data" },
      { status: 500 }
    );
  }
}

function determineSystemHealth(
  apiPerformance: MonitoringResponse["apiPerformance"],
  aiUsage: MonitoringResponse["aiUsage"],
  webVitals: MonitoringResponse["webVitals"]
): MonitoringResponse["systemHealth"] {
  const services: MonitoringResponse["systemHealth"]["services"] = [];

  // API health
  let apiStatus: "up" | "degraded" | "down" = "up";
  if (apiPerformance.errorRate > 10) apiStatus = "down";
  else if (apiPerformance.errorRate > 5 || apiPerformance.avgResponseTime > 1000) apiStatus = "degraded";

  services.push({
    name: "API",
    status: apiStatus,
    latency: apiPerformance.avgResponseTime,
  });

  // AI service health
  let aiStatus: "up" | "degraded" | "down" = "up";
  if (aiUsage.successRate < 80) aiStatus = "down";
  else if (aiUsage.successRate < 95 || aiUsage.avgLatency > 5000) aiStatus = "degraded";

  services.push({
    name: "AI Services",
    status: aiStatus,
    latency: aiUsage.avgLatency,
  });

  // Web performance health (based on Core Web Vitals)
  let webStatus: "up" | "degraded" | "down" = "up";
  const lcpGoodRate = webVitals.LCP.goodRate;
  const clsGoodRate = webVitals.CLS.goodRate;

  if (lcpGoodRate < 50 || clsGoodRate < 50) webStatus = "down";
  else if (lcpGoodRate < 75 || clsGoodRate < 75) webStatus = "degraded";

  services.push({
    name: "Web Performance",
    status: webStatus,
    latency: webVitals.LCP.avg,
  });

  // Database health (placeholder - would need actual monitoring)
  services.push({
    name: "Database",
    status: "up",
    latency: 0,
  });

  // Overall system health
  const downServices = services.filter((s) => s.status === "down").length;
  const degradedServices = services.filter((s) => s.status === "degraded").length;

  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (downServices > 0) overallStatus = "unhealthy";
  else if (degradedServices > 1) overallStatus = "degraded";

  return {
    status: overallStatus,
    services,
  };
}

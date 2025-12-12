/**
 * Comprehensive Performance Monitoring Utility for EquipmentSouq
 *
 * This module provides a unified interface for tracking:
 * - API response times
 * - Database query performance
 * - AI operation costs and latency
 * - Business metrics
 * - Error rates and anomalies
 *
 * All metrics are sent to Sentry for correlation with errors
 * and stored in the database for historical analysis.
 *
 * @see /docs/MONITORING_SETUP.md for full documentation
 */

import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";

// =============================================================================
// TYPES
// =============================================================================

export interface APIMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  durationMs: number;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface DatabaseMetrics {
  operation: string;
  model: string;
  durationMs: number;
  rowsAffected?: number;
  query?: string;
}

export interface AIOperationMetrics {
  provider: "anthropic" | "google" | "openai";
  service: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface WebVitalsMetrics {
  name: "LCP" | "FID" | "CLS" | "TTFB" | "INP" | "FCP";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  path: string;
  userId?: string;
  sessionId?: string;
}

export interface BusinessMetrics {
  eventType: string;
  userId?: string;
  sessionId?: string;
  data: Record<string, unknown>;
  country?: "SA" | "BH";
}

// =============================================================================
// THRESHOLDS
// Define acceptable thresholds for alerting
// =============================================================================

export const THRESHOLDS = {
  // API response time thresholds (milliseconds)
  api: {
    fast: 200,
    acceptable: 1000,
    slow: 3000,
  },
  // Database query thresholds (milliseconds)
  database: {
    fast: 50,
    acceptable: 200,
    slow: 1000,
  },
  // AI operation thresholds (milliseconds)
  ai: {
    fast: 2000,
    acceptable: 5000,
    slow: 15000,
  },
  // Web Vitals thresholds (as per Google's recommendations)
  webVitals: {
    LCP: { good: 2500, poor: 4000 }, // milliseconds
    FID: { good: 100, poor: 300 }, // milliseconds
    INP: { good: 200, poor: 500 }, // milliseconds
    CLS: { good: 0.1, poor: 0.25 }, // unitless
    TTFB: { good: 800, poor: 1800 }, // milliseconds
    FCP: { good: 1800, poor: 3000 }, // milliseconds
  },
} as const;

// =============================================================================
// MONITORING CLASS
// =============================================================================

class MonitoringService {
  private static instance: MonitoringService;
  private metricsBuffer: Map<string, unknown[]> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 10000; // 10 seconds

  private constructor() {
    // Start periodic flush if in server environment
    if (typeof window === "undefined") {
      this.startPeriodicFlush();
    }
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  // ---------------------------------------------------------------------------
  // API MONITORING
  // ---------------------------------------------------------------------------

  /**
   * Track API endpoint performance
   */
  async trackAPI(metrics: APIMetrics): Promise<void> {
    const { endpoint, method, statusCode, durationMs, userId, metadata } =
      metrics;

    // Determine performance rating
    const rating = this.getAPIRating(durationMs);

    // Send to Sentry as a custom measurement
    Sentry.setMeasurement("api.response_time", durationMs, "millisecond");

    // Add breadcrumb for debugging
    Sentry.addBreadcrumb({
      category: "api",
      message: `${method} ${endpoint}`,
      level: statusCode >= 400 ? "error" : "info",
      data: {
        statusCode,
        durationMs,
        rating,
        ...metadata,
      },
    });

    // Log slow requests to Sentry as a warning
    if (rating === "slow") {
      Sentry.captureMessage(`Slow API response: ${method} ${endpoint}`, {
        level: "warning",
        tags: {
          endpoint,
          method,
          rating,
        },
        extra: {
          durationMs,
          statusCode,
          userId,
          ...metadata,
        },
      });
    }

    // Buffer for batch database write
    this.bufferMetric("api", {
      eventType: "api_response",
      userId,
      data: {
        endpoint,
        method,
        statusCode,
        durationMs,
        rating,
        ...metadata,
      },
    });
  }

  /**
   * Create a timer for API requests
   */
  startAPITimer(
    endpoint: string,
    method: string
  ): (statusCode: number, metadata?: Record<string, unknown>) => Promise<void> {
    const startTime = performance.now();

    return async (
      statusCode: number,
      metadata?: Record<string, unknown>
    ): Promise<void> => {
      const durationMs = Math.round(performance.now() - startTime);
      await this.trackAPI({
        endpoint,
        method,
        statusCode,
        durationMs,
        metadata,
      });
    };
  }

  // ---------------------------------------------------------------------------
  // DATABASE MONITORING
  // ---------------------------------------------------------------------------

  /**
   * Track database query performance
   */
  async trackDatabase(metrics: DatabaseMetrics): Promise<void> {
    const { operation, model, durationMs, rowsAffected, query } = metrics;

    // Determine performance rating
    const rating = this.getDatabaseRating(durationMs);

    // Send to Sentry as a custom measurement
    Sentry.setMeasurement("db.query_time", durationMs, "millisecond");

    // Add breadcrumb
    Sentry.addBreadcrumb({
      category: "database",
      message: `${operation} on ${model}`,
      level: rating === "slow" ? "warning" : "info",
      data: {
        durationMs,
        rowsAffected,
        rating,
      },
    });

    // Log slow queries
    if (rating === "slow") {
      Sentry.captureMessage(`Slow database query: ${operation} on ${model}`, {
        level: "warning",
        tags: {
          operation,
          model,
          rating,
        },
        extra: {
          durationMs,
          rowsAffected,
          // Only log query in development for security
          query: process.env.NODE_ENV === "development" ? query : undefined,
        },
      });
    }
  }

  /**
   * Create a timer for database operations
   */
  startDBTimer(
    operation: string,
    model: string
  ): (rowsAffected?: number) => Promise<void> {
    const startTime = performance.now();

    return async (rowsAffected?: number): Promise<void> => {
      const durationMs = Math.round(performance.now() - startTime);
      await this.trackDatabase({
        operation,
        model,
        durationMs,
        rowsAffected,
      });
    };
  }

  // ---------------------------------------------------------------------------
  // AI MONITORING
  // ---------------------------------------------------------------------------

  /**
   * Track AI API usage and costs
   */
  async trackAI(metrics: AIOperationMetrics): Promise<void> {
    const {
      provider,
      service,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs,
      success,
      errorMessage,
      metadata,
    } = metrics;

    // Determine performance rating
    const rating = this.getAIRating(durationMs);

    // Send to Sentry
    Sentry.setMeasurement("ai.latency", durationMs, "millisecond");
    Sentry.setMeasurement("ai.input_tokens", inputTokens, "none");
    Sentry.setMeasurement("ai.output_tokens", outputTokens, "none");
    Sentry.setMeasurement("ai.cost", costUsd * 100, "none"); // in cents

    // Add breadcrumb
    Sentry.addBreadcrumb({
      category: "ai",
      message: `${provider}:${service}`,
      level: success ? "info" : "error",
      data: {
        inputTokens,
        outputTokens,
        costUsd,
        durationMs,
        success,
      },
    });

    // Log failures or slow operations
    if (!success || rating === "slow") {
      Sentry.captureMessage(
        success ? `Slow AI operation: ${service}` : `AI operation failed: ${service}`,
        {
          level: success ? "warning" : "error",
          tags: {
            provider,
            service,
            rating,
            success: String(success),
          },
          extra: {
            inputTokens,
            outputTokens,
            costUsd,
            durationMs,
            errorMessage,
            ...metadata,
          },
        }
      );
    }

    // Store in database for cost tracking
    try {
      await prisma.aIUsageLog.create({
        data: {
          provider,
          service,
          inputTokens,
          outputTokens,
          cost: costUsd,
          latencyMs: durationMs,
          success,
          errorMessage,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        },
      });
    } catch (error) {
      console.error("[Monitoring] Failed to log AI usage:", error);
      Sentry.captureException(error);
    }
  }

  /**
   * Create a timer for AI operations
   */
  startAITimer(
    provider: AIOperationMetrics["provider"],
    service: string
  ): (
    result:
      | { success: true; inputTokens: number; outputTokens: number; costUsd: number }
      | { success: false; errorMessage: string }
  ) => Promise<void> {
    const startTime = performance.now();

    return async (result): Promise<void> => {
      const durationMs = Math.round(performance.now() - startTime);

      if (result.success) {
        await this.trackAI({
          provider,
          service,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          costUsd: result.costUsd,
          durationMs,
          success: true,
        });
      } else {
        await this.trackAI({
          provider,
          service,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
          durationMs,
          success: false,
          errorMessage: result.errorMessage,
        });
      }
    };
  }

  // ---------------------------------------------------------------------------
  // WEB VITALS MONITORING
  // ---------------------------------------------------------------------------

  /**
   * Track Core Web Vitals metrics
   */
  async trackWebVitals(metrics: WebVitalsMetrics): Promise<void> {
    const { name, value, rating, path, userId, sessionId } = metrics;

    // Send to Sentry
    Sentry.setMeasurement(`web_vitals.${name.toLowerCase()}`, value, "none");

    // Add breadcrumb
    Sentry.addBreadcrumb({
      category: "web_vitals",
      message: `${name}: ${value}`,
      level: rating === "poor" ? "warning" : "info",
      data: {
        rating,
        path,
      },
    });

    // Alert on poor metrics
    if (rating === "poor") {
      Sentry.captureMessage(`Poor Web Vital: ${name}`, {
        level: "warning",
        tags: {
          vital: name,
          rating,
          path,
        },
        extra: {
          value,
          threshold: THRESHOLDS.webVitals[name],
        },
      });
    }

    // Buffer for database
    this.bufferMetric("web_vitals", {
      eventType: `web_vital_${name.toLowerCase()}`,
      userId,
      sessionId,
      data: {
        name,
        value,
        rating,
        path,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // BUSINESS METRICS
  // ---------------------------------------------------------------------------

  /**
   * Track business events for analytics
   */
  async trackBusinessEvent(metrics: BusinessMetrics): Promise<void> {
    const { eventType, userId, sessionId, data, country } = metrics;

    // Add Sentry breadcrumb
    Sentry.addBreadcrumb({
      category: "business",
      message: eventType,
      level: "info",
      data: {
        userId,
        country,
        ...data,
      },
    });

    // Buffer for database
    this.bufferMetric("business", {
      eventType,
      userId,
      sessionId,
      country,
      data,
    });
  }

  // ---------------------------------------------------------------------------
  // HELPER METHODS
  // ---------------------------------------------------------------------------

  private getAPIRating(durationMs: number): "fast" | "acceptable" | "slow" {
    if (durationMs <= THRESHOLDS.api.fast) return "fast";
    if (durationMs <= THRESHOLDS.api.acceptable) return "acceptable";
    return "slow";
  }

  private getDatabaseRating(
    durationMs: number
  ): "fast" | "acceptable" | "slow" {
    if (durationMs <= THRESHOLDS.database.fast) return "fast";
    if (durationMs <= THRESHOLDS.database.acceptable) return "acceptable";
    return "slow";
  }

  private getAIRating(durationMs: number): "fast" | "acceptable" | "slow" {
    if (durationMs <= THRESHOLDS.ai.fast) return "fast";
    if (durationMs <= THRESHOLDS.ai.acceptable) return "acceptable";
    return "slow";
  }

  /**
   * Get Web Vitals rating based on Google's thresholds
   */
  static getWebVitalRating(
    name: WebVitalsMetrics["name"],
    value: number
  ): WebVitalsMetrics["rating"] {
    const threshold = THRESHOLDS.webVitals[name];
    if (value <= threshold.good) return "good";
    if (value <= threshold.poor) return "needs-improvement";
    return "poor";
  }

  // ---------------------------------------------------------------------------
  // BUFFERING AND FLUSHING
  // ---------------------------------------------------------------------------

  private bufferMetric(type: string, data: unknown): void {
    if (!this.metricsBuffer.has(type)) {
      this.metricsBuffer.set(type, []);
    }

    const buffer = this.metricsBuffer.get(type)!;
    buffer.push(data);

    // Auto-flush if buffer is full
    if (buffer.length >= this.BUFFER_SIZE) {
      this.flush(type).catch(console.error);
    }
  }

  private startPeriodicFlush(): void {
    if (this.flushInterval) return;

    this.flushInterval = setInterval(() => {
      this.flushAll().catch(console.error);
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Flush metrics of a specific type to the database
   */
  async flush(type: string): Promise<void> {
    const buffer = this.metricsBuffer.get(type);
    if (!buffer || buffer.length === 0) return;

    // Get and clear buffer
    const metrics = [...buffer];
    buffer.length = 0;

    try {
      // Write to AnalyticsEvent table
      await prisma.analyticsEvent.createMany({
        data: metrics.map((m) => {
          const metric = m as {
            eventType: string;
            userId?: string;
            sessionId?: string;
            data: Record<string, unknown>;
            country?: "SA" | "BH";
          };
          return {
            eventType: metric.eventType,
            userId: metric.userId ?? null,
            sessionId: metric.sessionId ?? null,
            data: JSON.parse(JSON.stringify(metric.data)),
            country: metric.country ?? null,
          };
        }),
      });
    } catch (error) {
      console.error(`[Monitoring] Failed to flush ${type} metrics:`, error);
      Sentry.captureException(error);
      // Re-add failed metrics to buffer for retry
      buffer.push(...metrics);
    }
  }

  /**
   * Flush all metric types
   */
  async flushAll(): Promise<void> {
    const types = Array.from(this.metricsBuffer.keys());
    await Promise.all(types.map((type) => this.flush(type)));
  }

  /**
   * Stop periodic flushing (for graceful shutdown)
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}

// =============================================================================
// EXPORTED SINGLETON
// =============================================================================

export const monitoring = MonitoringService.getInstance();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Higher-order function to wrap API handlers with monitoring
 */
export function withAPIMonitoring<T extends unknown[], R>(
  endpoint: string,
  method: string,
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const endTimer = monitoring.startAPITimer(endpoint, method);
    let statusCode = 200;

    try {
      const result = await handler(...args);
      return result;
    } catch (error) {
      statusCode = 500;
      throw error;
    } finally {
      await endTimer(statusCode);
    }
  };
}

/**
 * Higher-order function to wrap database operations with monitoring
 */
export function withDBMonitoring<T extends unknown[], R>(
  operation: string,
  model: string,
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const endTimer = monitoring.startDBTimer(operation, model);

    try {
      const result = await handler(...args);
      return result;
    } finally {
      await endTimer();
    }
  };
}

// =============================================================================
// AI COST CALCULATOR
// =============================================================================

/**
 * Calculate cost for Claude API calls
 * Prices as of January 2025
 */
export function calculateClaudeCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Pricing per 1M tokens (USD)
  const pricing: Record<string, { input: number; output: number }> = {
    "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
    "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
    "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
    "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
    "claude-opus-4-5-20251101": { input: 15.0, output: 75.0 },
  };

  const modelPricing = pricing[model] || pricing["claude-sonnet-4-20250514"];

  const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}

/**
 * Calculate cost for Gemini API calls
 * Prices as of January 2025
 */
export function calculateGeminiCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Pricing per 1M tokens (USD)
  const pricing: Record<string, { input: number; output: number }> = {
    "gemini-2.0-flash-exp": { input: 0.0, output: 0.0 }, // Free tier
    "gemini-1.5-flash": { input: 0.075, output: 0.30 },
    "gemini-1.5-pro": { input: 1.25, output: 5.0 },
    "gemini-1.0-pro": { input: 0.5, output: 1.5 },
  };

  const modelPricing = pricing[model] || pricing["gemini-1.5-flash"];

  const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}

// =============================================================================
// AGGREGATE METRICS QUERIES
// =============================================================================

/**
 * Get AI usage statistics for a time period
 */
export async function getAIUsageStats(
  startDate: Date,
  endDate: Date
): Promise<{
  totalCost: number;
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  byProvider: Record<string, { cost: number; requests: number }>;
  byService: Record<string, { cost: number; requests: number }>;
}> {
  const logs = await prisma.aIUsageLog.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      provider: true,
      service: true,
      cost: true,
      latencyMs: true,
      success: true,
    },
  });

  const totalRequests = logs.length;
  const successCount = logs.filter((l) => l.success).length;
  const totalCost = logs.reduce((sum, l) => sum + Number(l.cost), 0);
  const totalLatency = logs.reduce((sum, l) => sum + l.latencyMs, 0);

  const byProvider: Record<string, { cost: number; requests: number }> = {};
  const byService: Record<string, { cost: number; requests: number }> = {};

  for (const log of logs) {
    // By provider
    if (!byProvider[log.provider]) {
      byProvider[log.provider] = { cost: 0, requests: 0 };
    }
    byProvider[log.provider].cost += Number(log.cost);
    byProvider[log.provider].requests += 1;

    // By service
    if (!byService[log.service]) {
      byService[log.service] = { cost: 0, requests: 0 };
    }
    byService[log.service].cost += Number(log.cost);
    byService[log.service].requests += 1;
  }

  return {
    totalCost,
    totalRequests,
    successRate: totalRequests > 0 ? (successCount / totalRequests) * 100 : 0,
    avgLatency: totalRequests > 0 ? totalLatency / totalRequests : 0,
    byProvider,
    byService,
  };
}

/**
 * Get API performance statistics
 */
export async function getAPIPerformanceStats(
  startDate: Date,
  endDate: Date
): Promise<{
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
  slowRequestRate: number;
  byEndpoint: Record<
    string,
    { requests: number; avgTime: number; errorRate: number }
  >;
}> {
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
    },
  });

  const totalRequests = events.length;
  let totalTime = 0;
  let errorCount = 0;
  let slowCount = 0;

  const byEndpoint: Record<
    string,
    { requests: number; totalTime: number; errors: number }
  > = {};

  for (const event of events) {
    const data = event.data as {
      endpoint: string;
      durationMs: number;
      statusCode: number;
      rating: string;
    };

    totalTime += data.durationMs;
    if (data.statusCode >= 400) errorCount++;
    if (data.rating === "slow") slowCount++;

    if (!byEndpoint[data.endpoint]) {
      byEndpoint[data.endpoint] = { requests: 0, totalTime: 0, errors: 0 };
    }
    byEndpoint[data.endpoint].requests++;
    byEndpoint[data.endpoint].totalTime += data.durationMs;
    if (data.statusCode >= 400) byEndpoint[data.endpoint].errors++;
  }

  return {
    totalRequests,
    avgResponseTime: totalRequests > 0 ? totalTime / totalRequests : 0,
    errorRate: totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0,
    slowRequestRate: totalRequests > 0 ? (slowCount / totalRequests) * 100 : 0,
    byEndpoint: Object.fromEntries(
      Object.entries(byEndpoint).map(([endpoint, stats]) => [
        endpoint,
        {
          requests: stats.requests,
          avgTime: stats.totalTime / stats.requests,
          errorRate: (stats.errors / stats.requests) * 100,
        },
      ])
    ),
  };
}

export default monitoring;

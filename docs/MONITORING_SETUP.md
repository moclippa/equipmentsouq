# EquipmentSouq Monitoring Setup

This document describes the comprehensive monitoring infrastructure for EquipmentSouq, including error tracking, performance monitoring, and observability tools.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Sentry Integration](#sentry-integration)
4. [Custom Performance Monitoring](#custom-performance-monitoring)
5. [Web Vitals Tracking](#web-vitals-tracking)
6. [Admin Monitoring Dashboard](#admin-monitoring-dashboard)
7. [Environment Variables](#environment-variables)
8. [Setup Instructions](#setup-instructions)
9. [Usage Examples](#usage-examples)
10. [Alerting Configuration](#alerting-configuration)
11. [Troubleshooting](#troubleshooting)

---

## Overview

EquipmentSouq uses a multi-layered monitoring approach:

| Layer | Tool | Purpose |
|-------|------|---------|
| Error Tracking | Sentry | Exception capture, stack traces, session replay |
| APM | Sentry + Custom | Performance monitoring, transaction tracing |
| Web Vitals | Custom Provider | Core Web Vitals (LCP, FID, CLS, TTFB, INP) |
| AI Cost Tracking | Custom | API cost tracking, token usage, latency |
| Business Metrics | Custom | Analytics events, user behavior |
| Infrastructure | Vercel Analytics | Serverless function performance |

### Key Metrics Tracked

- **Error Rate**: Percentage of requests resulting in errors
- **Response Time**: API and page load latency
- **Core Web Vitals**: LCP, FID, INP, CLS, TTFB, FCP
- **AI Costs**: Token usage and USD costs per provider/service
- **Active Users**: Unique users in a time period
- **Slow Requests**: Requests exceeding acceptable thresholds

---

## Architecture

```
+-------------------+     +-------------------+     +-------------------+
|   Browser/Client  |     |  Next.js Server   |     |    PostgreSQL     |
|                   |     |                   |     |                   |
|  - Web Vitals     |     |  - API Routes     |     |  - AIUsageLog     |
|  - Session Replay |---->|  - SSR/RSC        |---->|  - AnalyticsEvent |
|  - Error Capture  |     |  - Middleware     |     |  - AdminAuditLog  |
+-------------------+     +-------------------+     +-------------------+
         |                        |                        |
         v                        v                        |
+-------------------+     +-------------------+            |
|      Sentry       |     |   Custom APIs     |<-----------+
|                   |     |                   |
|  - Errors         |     |  /api/admin/      |
|  - Transactions   |     |    monitoring     |
|  - Replay         |     +-------------------+
+-------------------+
```

### Data Flow

1. **Client-side**: Web Vitals Provider captures performance metrics and sends to Sentry + analytics API
2. **Server-side**: API routes use monitoring utility to track response times and AI costs
3. **Database**: Metrics are buffered and batch-written to PostgreSQL for historical analysis
4. **Sentry**: Real-time error tracking and performance monitoring

---

## Sentry Integration

### Configuration Files

| File | Purpose |
|------|---------|
| `sentry.client.config.ts` | Browser-side configuration |
| `sentry.server.config.ts` | Node.js server configuration |
| `sentry.edge.config.ts` | Edge runtime configuration |
| `next.config.ts` | Webpack plugin integration |

### Sampling Rates

| Metric Type | Development | Production |
|-------------|-------------|------------|
| Error Sample Rate | 100% | 100% |
| Transaction Sample Rate | 100% | 10% |
| Session Replay | 0% | 1% (100% on error) |

### Features Enabled

- **Error Tracking**: Automatic exception capture with full stack traces
- **Performance Monitoring**: Transaction and span tracing
- **Session Replay**: Video-like reproduction of user sessions on errors
- **Release Tracking**: Automatic version tagging from Git commits
- **Source Maps**: Uploaded during build for readable stack traces
- **Tunnel Route**: `/monitoring` endpoint to bypass ad blockers

### Filtered Events

The following are automatically filtered to reduce noise:

**Ignored Errors**:
- Browser extension errors
- Network errors (handled by app)
- Cancelled requests
- Safari private browsing errors
- ResizeObserver warnings

**Ignored Transactions**:
- Health check endpoints
- Static assets (`/_next/`, `/favicon.ico`)

### Sensitive Data Handling

- User PII is scrubbed (only user ID retained)
- Passwords, tokens, and OTPs are redacted
- Sensitive headers (Authorization, Cookie) are removed

---

## Custom Performance Monitoring

### Location

`src/lib/monitoring.ts`

### Features

1. **API Monitoring**: Track endpoint response times and error rates
2. **Database Monitoring**: Query performance tracking
3. **AI Cost Tracking**: Token usage, costs, and latency per operation
4. **Business Events**: Custom analytics event tracking

### Performance Thresholds

| Metric Type | Fast | Acceptable | Slow |
|-------------|------|------------|------|
| API Response | <200ms | <1000ms | >3000ms |
| Database Query | <50ms | <200ms | >1000ms |
| AI Operation | <2000ms | <5000ms | >15000ms |

### Usage

```typescript
import { monitoring } from "@/lib/monitoring";

// Track API performance
const endTimer = monitoring.startAPITimer("/api/equipment", "GET");
// ... handle request ...
await endTimer(200, { itemCount: 50 });

// Track database operations
const dbTimer = monitoring.startDBTimer("findMany", "Equipment");
const equipment = await prisma.equipment.findMany();
await dbTimer(equipment.length);

// Track AI operations
const aiTimer = monitoring.startAITimer("anthropic", "classify-equipment");
try {
  const result = await claudeClient.complete(...);
  await aiTimer({
    success: true,
    inputTokens: result.usage.input_tokens,
    outputTokens: result.usage.output_tokens,
    costUsd: calculateClaudeCost("claude-sonnet-4-20250514", inputTokens, outputTokens),
  });
} catch (error) {
  await aiTimer({ success: false, errorMessage: error.message });
}
```

### Higher-Order Functions

```typescript
import { withAPIMonitoring, withDBMonitoring } from "@/lib/monitoring";

// Wrap entire handler with monitoring
const handler = withAPIMonitoring("/api/equipment", "GET", async (request) => {
  // Your handler logic
  return NextResponse.json(data);
});
```

---

## Web Vitals Tracking

### Location

`src/components/providers/web-vitals-provider.tsx`

### Tracked Metrics

| Metric | Description | Good | Poor |
|--------|-------------|------|------|
| LCP | Largest Contentful Paint | <2.5s | >4s |
| FID | First Input Delay | <100ms | >300ms |
| INP | Interaction to Next Paint | <200ms | >500ms |
| CLS | Cumulative Layout Shift | <0.1 | >0.25 |
| TTFB | Time to First Byte | <800ms | >1.8s |
| FCP | First Contentful Paint | <1.8s | >3s |

### Integration

Add to your root layout:

```tsx
// src/app/layout.tsx
import { WebVitalsProvider } from "@/components/providers/web-vitals-provider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <WebVitalsProvider debug={process.env.NODE_ENV === "development"}>
          {children}
        </WebVitalsProvider>
      </body>
    </html>
  );
}
```

### Debug Mode

Enable the visual debug overlay in development:

```tsx
import { WebVitalsDebug } from "@/components/providers/web-vitals-provider";

// Shows real-time Web Vitals in bottom-right corner
<WebVitalsDebug position="bottom-right" />
```

### Custom Metrics Hook

```typescript
import { useWebVitals } from "@/components/providers/web-vitals-provider";

function MyComponent() {
  const { trackCustomMetric, startTimer } = useWebVitals();

  const handleSubmit = async () => {
    const endTimer = startTimer("form_submission");
    await submitForm();
    endTimer(); // Automatically reports duration
  };

  // Or track specific values
  trackCustomMetric("search_results_count", results.length, "none");
}
```

---

## Admin Monitoring Dashboard

### Endpoint

`GET /api/admin/monitoring`

### Query Parameters

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| period | `1h`, `24h`, `7d`, `30d` | `24h` | Time period for metrics |

### Response Structure

```typescript
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
    byEndpoint: Record<string, { requests: number; avgTime: number; errorRate: number }>;
  };
  webVitals: {
    LCP: { avg: number; p75: number; goodRate: number };
    // ... other vitals
  };
  systemHealth: {
    status: "healthy" | "degraded" | "unhealthy";
    services: Array<{ name: string; status: string; latency: number }>;
  };
  recentErrors: Array<{
    id: string;
    message: string;
    count: number;
    lastOccurred: string;
    severity: string;
  }>;
  trends: {
    requests: number[];
    errors: number[];
    responseTime: number[];
    labels: string[];
  };
}
```

### Access Control

- Requires authenticated session
- Requires `ADMIN` role

---

## Environment Variables

### Required for Sentry

```env
# Sentry DSN (from sentry.io dashboard)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Sentry organization and project (for source maps)
SENTRY_ORG=your-org
SENTRY_PROJECT=equipmentsouq

# Sentry auth token (for uploading source maps)
SENTRY_AUTH_TOKEN=sntrys_xxx
```

### Optional

```env
# Enable Sentry debugging in development
NEXT_PUBLIC_SENTRY_DEBUG=true

# Vercel-provided (automatic)
VERCEL_GIT_COMMIT_SHA=xxx
NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA=xxx
```

---

## Setup Instructions

### 1. Create Sentry Project

1. Go to [sentry.io](https://sentry.io) and create an account
2. Create a new project, select "Next.js"
3. Copy the DSN from the project settings

### 2. Configure Environment Variables

```bash
# Local development
cp .env.example .env

# Add Sentry variables
NEXT_PUBLIC_SENTRY_DSN=your-dsn
SENTRY_DSN=your-dsn
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-token
```

### 3. Vercel Configuration

1. Go to Vercel Dashboard > Project Settings > Environment Variables
2. Add the following variables:
   - `SENTRY_DSN`
   - `NEXT_PUBLIC_SENTRY_DSN`
   - `SENTRY_ORG`
   - `SENTRY_PROJECT`
   - `SENTRY_AUTH_TOKEN`

### 4. Generate Sentry Auth Token

1. Go to Sentry > Settings > Auth Tokens
2. Create a new token with scopes:
   - `project:read`
   - `project:write`
   - `project:releases`
   - `org:read`

### 5. Add Web Vitals Provider

Update `src/app/layout.tsx`:

```tsx
import { WebVitalsProvider } from "@/components/providers/web-vitals-provider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <WebVitalsProvider>
          {children}
        </WebVitalsProvider>
      </body>
    </html>
  );
}
```

### 6. Verify Setup

1. Start development server: `npm run dev`
2. Trigger an error (e.g., `/api/test-error`)
3. Check Sentry dashboard for the error
4. Navigate around the app to generate Web Vitals data
5. Check `/api/admin/monitoring` for aggregated metrics

---

## Usage Examples

### Track Custom Errors

```typescript
import * as Sentry from "@sentry/nextjs";

try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      feature: "equipment-listing",
      action: "create",
    },
    extra: {
      userId: session.user.id,
      equipmentType: data.type,
    },
  });
  throw error;
}
```

### Track Business Events

```typescript
import { monitoring } from "@/lib/monitoring";

// Track lead creation
await monitoring.trackBusinessEvent({
  eventType: "lead_created",
  userId: session.user.id,
  data: {
    equipmentId: equipment.id,
    equipmentType: equipment.category,
    value: equipment.price,
  },
  country: equipment.country,
});
```

### Track AI Usage

```typescript
import { monitoring, calculateClaudeCost } from "@/lib/monitoring";

const aiTimer = monitoring.startAITimer("anthropic", "generate-listing");

const response = await claude.messages.create({
  model: "claude-sonnet-4-20250514",
  messages: [...],
});

await aiTimer({
  success: true,
  inputTokens: response.usage.input_tokens,
  outputTokens: response.usage.output_tokens,
  costUsd: calculateClaudeCost(
    "claude-sonnet-4-20250514",
    response.usage.input_tokens,
    response.usage.output_tokens
  ),
});
```

---

## Alerting Configuration

### Sentry Alerts

Configure these alerts in Sentry:

1. **High Error Rate**
   - Trigger: Error count > 10 in 5 minutes
   - Action: Email + Slack notification

2. **New Error Type**
   - Trigger: First occurrence of error
   - Action: Email notification

3. **Slow Transaction**
   - Trigger: P95 response time > 3000ms
   - Action: Slack notification

### Custom Alerts (via monitoring API)

The monitoring API provides system health status. Integrate with your alerting system:

```typescript
// Example: Check system health every 5 minutes
const response = await fetch("/api/admin/monitoring");
const data = await response.json();

if (data.systemHealth.status === "unhealthy") {
  // Send alert
}
```

---

## Troubleshooting

### Sentry Not Receiving Events

1. **Check DSN**: Verify `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. **Check CSP**: Ensure `*.sentry.io` and `*.ingest.sentry.io` are allowed
3. **Check Console**: Look for Sentry initialization messages
4. **Verify Tunnel**: Try disabling tunnel route to test direct connection

### Source Maps Not Working

1. **Check Auth Token**: Verify `SENTRY_AUTH_TOKEN` has correct permissions
2. **Check Build**: Ensure source maps are generated during build
3. **Check Release**: Verify release version matches in Sentry

### Web Vitals Not Appearing

1. **Check Provider**: Ensure `WebVitalsProvider` wraps your app
2. **Check Analytics API**: Verify `/api/analytics` endpoint is accessible
3. **Check Database**: Verify `AnalyticsEvent` table exists
4. **Check Session**: Events may be buffered - wait for flush interval

### High Monitoring Costs

1. **Reduce Sampling**: Lower `tracesSampleRate` in production
2. **Filter Events**: Add more patterns to `ignoreErrors`
3. **Disable Replay**: Set `replaysSessionSampleRate` to 0
4. **Reduce Retention**: Configure shorter data retention in Sentry

---

## Database Schema

The monitoring system uses these tables:

```prisma
model AIUsageLog {
  id            String      @id @default(cuid())
  provider      String      // "anthropic", "google", "openai"
  service       String      // "classify-equipment", "generate-listing"
  inputTokens   Int
  outputTokens  Int
  cost          Decimal     @db.Decimal(10, 6)
  latencyMs     Int
  success       Boolean
  errorMessage  String?
  metadata      Json?
  createdAt     DateTime    @default(now())
}

model AnalyticsEvent {
  id            String      @id @default(cuid())
  eventType     String      // "api_response", "web_vital_lcp", "lead_created"
  userId        String?
  sessionId     String?
  data          Json
  country       Country?
  createdAt     DateTime    @default(now())
}
```

---

## Cost Estimates

### Sentry (Free Tier)
- 5,000 errors/month
- 10,000 transactions/month
- 50 replays/month

### Sentry (Team Plan - $26/month)
- 50,000 errors/month
- 100,000 transactions/month
- 500 replays/month

### Recommendations

For EquipmentSouq's expected traffic:

1. Start with Free tier during development
2. Upgrade to Team plan at launch
3. Use 10% transaction sampling in production
4. Enable replay only on errors (100% on error, 0% on sessions)

---

## Related Documentation

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Web Vitals by Google](https://web.dev/vitals/)
- [Next.js Analytics](https://nextjs.org/docs/app/building-your-application/optimizing/analytics)
- [Vercel Analytics](https://vercel.com/docs/analytics)

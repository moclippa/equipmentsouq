# Load Testing Documentation

Complete guide to performance and load testing for EquipmentSouq.

## Overview

EquipmentSouq uses [k6](https://k6.io/) for load testing - a modern, developer-friendly tool that tests system performance under various traffic conditions. Load tests help ensure the platform remains fast and reliable as traffic grows.

## Quick Start

```bash
# 1. Install k6
brew install k6  # macOS
# See tests/load/SETUP.md for other platforms

# 2. Start development server
npm run dev

# 3. Run load test
npm run test:load
```

## What Gets Tested

### Critical User Journeys

**Anonymous Users (80% of traffic):**
1. Homepage load (GET /)
2. Category listing (GET /api/categories)
3. Equipment search with filters (GET /api/equipment)
4. Equipment detail page (GET /api/equipment/[id])

**Authenticated Users (20% of traffic):**
1. Phone OTP authentication (POST /api/auth/otp/send, /api/auth/otp/verify)
2. Browse equipment (reuses anonymous journey)
3. Lead creation (POST /api/leads)

### Performance Budgets

| Journey | Metric | Target (P95) |
|---------|--------|--------------|
| Homepage | LCP | < 2.5s |
| Homepage | FCP | < 1.8s |
| API (General) | Response Time | < 500ms |
| Search API | Response Time | < 1s |
| Equipment Detail | Response Time | < 500ms |
| Lead Creation | Response Time | < 1s |
| Error Rate | HTTP Failures | < 5% |

## Test Scenarios

### 1. Normal Load (Default)
**Purpose:** Simulate typical daily traffic
**Profile:** 100 concurrent users, 5-minute sustained load
**Run:** `npm run test:load`

Use this for:
- Pre-merge PR validation
- Regular performance checks
- Establishing baselines

### 2. Spike Test
**Purpose:** Test resilience to sudden traffic spikes
**Profile:** Sudden spike to 500 users for 2 minutes
**Run:** `npm run test:load:spike`

Use this for:
- Pre-launch testing (marketing campaigns)
- Viral traffic simulation
- Validating auto-scaling

### 3. Stress Test
**Purpose:** Find system breaking point
**Profile:** 1000 concurrent users, 10 minutes
**Run:** `npm run test:load:stress`

Use this for:
- Capacity planning
- Infrastructure sizing
- Finding bottlenecks

### 4. Soak Test
**Purpose:** Find memory leaks and degradation over time
**Profile:** 50 concurrent users, 30 minutes continuous
**Run:** `npm run test:load:soak`

Use this for:
- Pre-deployment validation
- Long-running stability checks
- Memory leak detection

## Understanding Results

### Key Metrics

**HTTP Duration (P95):** 95% of requests complete within this time
- Good: < 500ms
- Acceptable: 500-1000ms
- Poor: > 1000ms

**Error Rate:** Percentage of failed requests (4xx, 5xx)
- Excellent: < 1%
- Acceptable: 1-5%
- Poor: > 5%

**Throughput:** Requests per second the system can handle
- Monitor for drops during sustained load

**Custom Metrics:**
- `homepage_load_time` - Full page render time
- `search_response_time` - Search API latency
- `equipment_detail_time` - Equipment fetch latency
- `lead_creation_time` - Lead submission latency
- `auth_flow_time` - Complete auth flow (OTP send + verify)

### Example Output

```
running (12m03.5s), 000/100 VUs, 45,231 complete and 0 interrupted iterations

✓ Homepage status is 200
✓ Search response time < 1s
✓ Equipment detail response time < 500ms

checks........................: 98.50% ✓ 133456 ✗ 2034
http_req_duration..............: avg=324ms min=89ms med=276ms max=1.2s p(95)=648ms
http_req_failed................: 2.34% ✓ 156 ✗ 6508
http_reqs......................: 6,664 (9.2/s)
iterations.....................: 45,231

homepage_load_time.............: avg=1.2s min=456ms med=1.1s max=2.8s p(95)=2.3s
search_response_time...........: avg=456ms min=123ms med=398ms max=1.8s p(95)=891ms
```

**Interpretation:**
- **45,231 iterations:** Users completed 45k full journeys in 12 minutes
- **P95 648ms:** 95% of requests completed in < 648ms (within budget)
- **2.34% error rate:** Acceptable (< 5%)
- **9.2 req/s:** Throughput is healthy

## Performance Budget Checking

After running tests, check against budgets:

```bash
node tests/load/check-budgets.js --summary summary-normal.json
```

Output:
```
========================================
Performance Budget Check
========================================

API Endpoints - General:
  P50: 198.45ms / 200ms ✅
  P95: 456.78ms / 500ms ✅
  P99: 987.23ms / 1000ms ✅
  Error Rate: 2.34% / 1% ❌

Summary:
  Passed: 3
  Failed: 1
========================================
```

## Baseline Comparison

Detect performance regressions by comparing against baseline:

```bash
# Run baseline (on main branch)
git checkout main
npm run test:load
cp summary-normal.json baseline.json

# Run after changes (on feature branch)
git checkout feature/my-optimization
npm run test:load
cp summary-normal.json current.json

# Compare
node tests/load/compare-baseline.js \
  --baseline baseline.json \
  --current current.json \
  --threshold 20
```

Output:
```
HTTP Request Duration:
  P50: 198.45ms (-5.2%) 🎉  # Improvement
  P95: 456.78ms (+3.1%) ✅  # Within threshold
  P99: 987.23ms (+25.4%) ❌ # Regression detected!

❌ Performance regressions detected!

1 metric(s) degraded by more than 20%:
  - P99: 789.15ms → 987.23ms (+25.1%)
```

## CI/CD Integration

Load tests run automatically in GitHub Actions on:

1. **Pull Requests** to main (when performance-related files change)
2. **Manual Dispatch** via GitHub UI (Actions tab)
3. **Weekly Schedule** (Mondays at 2 AM UTC)

### Workflow Steps

1. Set up PostgreSQL test database
2. Install k6
3. Install Node.js dependencies
4. Run database migrations and seed
5. Build Next.js in production mode
6. Start Next.js server
7. Run k6 load tests
8. Check performance budgets
9. Compare against baseline (from main branch)
10. Comment PR with results
11. Upload test results as artifacts
12. **Fail PR** if budgets exceeded or regressions > 20%

### PR Comments

The workflow automatically comments on PRs with results:

```markdown
## 🚀 Performance Test Results (normal)

### Key Metrics

| Metric | P50 | P95 | P99 | Max | Status |
|--------|-----|-----|-----|-----|--------|
| HTTP Duration | 198ms | 457ms | 987ms | 1.2s | ✅ |
| Homepage Load | 1.1s | 2.3s | 2.8s | 3.2s | ✅ |
| Search Response | 398ms | 891ms | 1.3s | 1.8s | ✅ |

### Error Rates

- HTTP Failures: 2.34% ✅
- Total Requests: 6,664
- Failed Requests: 156

### Thresholds

- ✅ http_req_duration{endpoint:search} < 1000ms
- ✅ http_req_duration{endpoint:equipment} < 500ms
- ❌ http_req_failed < 1%
```

## Local Development Workflow

### Testing During Development

```bash
# Quick test (2 minutes, 20 users)
k6 run --vus 20 --duration 2m tests/load/k6-load-test.js

# Full test before pushing
npm run test:load

# Test specific endpoint (create custom script)
cat > tests/load/my-test.js << 'EOF'
import http from 'k6/http';
export const options = { vus: 10, duration: '1m' };
export default function() {
  http.get('http://localhost:3000/api/my-endpoint');
}
EOF

k6 run tests/load/my-test.js
```

### Before Merging PR

**Checklist:**
- [ ] Run `npm run test:load` locally
- [ ] Error rate < 5%
- [ ] P95 within budgets
- [ ] No regressions vs baseline
- [ ] CI/CD tests pass

## Optimization Guide

### Common Performance Issues

**1. Slow Database Queries**

**Symptom:** P95 > 1s for search/detail endpoints

**Solutions:**
```sql
-- Add indexes
CREATE INDEX idx_equipment_category ON equipment(category);
CREATE INDEX idx_equipment_location ON equipment(location);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_owner ON equipment("ownerId");

-- Composite indexes for common filters
CREATE INDEX idx_equipment_category_location ON equipment(category, location, status);
```

**2. N+1 Query Problems**

**Symptom:** Many small database queries instead of one optimized query

**Solutions:**
```typescript
// Bad: N+1 queries
const equipment = await prisma.equipment.findMany();
for (const e of equipment) {
  e.owner = await prisma.user.findUnique({ where: { id: e.ownerId } });
}

// Good: Single query with include
const equipment = await prisma.equipment.findMany({
  include: {
    owner: {
      select: { id: true, fullName: true, phone: true }
    },
    images: true,
    category: true,
  }
});
```

**3. Missing Caching**

**Symptom:** Categories API called frequently, always hits database

**Solutions:**
```typescript
// Add Redis caching
import { redis } from '@/lib/redis';

export async function GET() {
  const cached = await redis.get('categories');
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }

  const categories = await prisma.category.findMany();
  await redis.set('categories', JSON.stringify(categories), {
    ex: 60 * 60 * 24, // 24 hour TTL
  });

  return NextResponse.json(categories);
}
```

**4. Large Response Payloads**

**Symptom:** Slow response times despite fast database queries

**Solutions:**
```typescript
// Bad: Return everything
const equipment = await prisma.equipment.findMany();

// Good: Select only needed fields
const equipment = await prisma.equipment.findMany({
  select: {
    id: true,
    title: true,
    category: true,
    price: true,
    location: true,
    images: {
      select: { url: true },
      take: 1, // Only first image for listing
    },
  },
});
```

**5. Synchronous Operations**

**Symptom:** Lead creation > 2s (waiting for SMS)

**Solutions:**
```typescript
// Bad: Wait for SMS before responding
await sendSMS(phone, message);
return NextResponse.json({ success: true });

// Good: Queue SMS, respond immediately
await queueSMS(phone, message); // Background job
return NextResponse.json({ success: true });
```

## Monitoring in Production

### Recommended Tools

1. **Application Performance Monitoring (APM)**
   - Datadog APM
   - New Relic
   - Sentry Performance

2. **Database Monitoring**
   - pgHero (PostgreSQL)
   - Prisma Pulse

3. **Real User Monitoring (RUM)**
   - Vercel Analytics
   - Google Analytics 4 (Core Web Vitals)

### Setting Up Alerts

**Critical Alerts:**
- Error rate > 5% for 5 minutes
- P95 response time > 2s for 5 minutes
- Database connection pool > 80% for 2 minutes

**Warning Alerts:**
- P95 response time > 1s for 10 minutes
- Memory usage > 85% for 5 minutes

## Documentation

- **[README.md](../tests/load/README.md)** - Overview and getting started
- **[SETUP.md](../tests/load/SETUP.md)** - Installation and configuration
- **[EXAMPLES.md](../tests/load/EXAMPLES.md)** - Real-world usage examples
- **[QUICKREF.md](../tests/load/QUICKREF.md)** - Quick reference cheat sheet
- **[performance-budgets.json](../tests/load/performance-budgets.json)** - Budget definitions

## Support

For help with load testing:

1. Check the documentation above
2. Review [k6 documentation](https://k6.io/docs/)
3. Check GitHub Actions workflow logs
4. Ask in team chat with test results attached

## Related Documentation

- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Prisma Performance](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Web Performance Best Practices](https://web.dev/fast/)
- [Core Web Vitals](https://web.dev/vitals/)

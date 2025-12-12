# Load Testing for EquipmentSouq

This directory contains comprehensive load testing infrastructure for EquipmentSouq using [k6](https://k6.io/), an open-source load testing tool.

## Overview

The load testing suite validates critical user journeys under various traffic conditions:

- **Normal Load**: 100 concurrent users (typical business hours)
- **Spike Test**: Sudden spike to 500 users (viral social media, marketing campaigns)
- **Stress Test**: 1000 concurrent users (find breaking point)
- **Soak Test**: 50 users for 30 minutes (memory leaks, degradation over time)

## Prerequisites

### 1. Install k6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```bash
choco install k6
```

Or download from: https://k6.io/docs/get-started/installation/

### 2. Start EquipmentSouq Server

Ensure the development server is running:
```bash
npm run dev
# Server should be running on http://localhost:3000
```

For production testing, set `BASE_URL` environment variable (see below).

## Running Load Tests

### Quick Start

```bash
# Run normal load test (100 concurrent users)
npm run test:load

# Run spike test (500 concurrent users)
npm run test:load:spike

# Run stress test (1000 concurrent users)
npm run test:load:stress

# Run soak test (50 users for 30 minutes)
npm run test:load:soak
```

### Direct k6 Commands

```bash
# Basic run
k6 run tests/load/k6-load-test.js

# Test against production
BASE_URL=https://equipmentsouq.com k6 run tests/load/k6-load-test.js

# Generate HTML report
k6 run --out json=test-results.json tests/load/k6-load-test.js
k6 report test-results.json --out html-report.html

# Run with custom VUs (virtual users)
k6 run --vus 50 --duration 5m tests/load/k6-load-test.js

# Run specific scenario only
k6 run --scenarios normal_load tests/load/k6-load-test.js
```

## Test Scenarios

The load test script includes multiple scenarios that run in parallel:

### 1. Normal User Journey (80% of traffic)
Simulates anonymous browsing:
1. **Homepage load** - GET /
2. **Category listing** - GET /api/categories
3. **Equipment search** - GET /api/equipment with filters (category, location, listing type)
4. **Equipment detail** - GET /api/equipment/[id]

**Load Profile:**
- Ramp up: 0 → 20 VUs over 2 minutes (warm-up)
- Scale: 20 → 100 VUs over 3 minutes
- Sustain: 100 VUs for 5 minutes
- Ramp down: 100 → 0 VUs over 2 minutes

### 2. Authenticated User Journey (20% of traffic)
Simulates logged-in users creating leads:
1. **Authentication** - POST /api/auth/otp/send + /api/auth/otp/verify
2. **Browse equipment** (reuses normal journey)
3. **Lead creation** - POST /api/leads

**Load Profile:**
- Ramp up: 0 → 5 VUs over 2 minutes
- Scale: 5 → 20 VUs over 3 minutes
- Sustain: 20 VUs for 5 minutes
- Ramp down: 20 → 0 VUs over 2 minutes

## Performance Budgets

Performance budgets are defined in `performance-budgets.json`. Key thresholds:

| Metric | Target | Description |
|--------|--------|-------------|
| **Homepage LCP** | < 2.5s (p95) | Largest Contentful Paint |
| **Homepage FCP** | < 1.8s (p95) | First Contentful Paint |
| **API Response** | < 500ms (p95) | General API endpoints |
| **Search API** | < 1s (p95) | Equipment search with filters |
| **Error Rate** | < 5% | HTTP errors (4xx, 5xx) |
| **Search Errors** | < 2% | Search-specific errors |
| **Auth Errors** | < 1% | Authentication failures |

## Custom Metrics

The load test tracks custom metrics beyond standard HTTP metrics:

### Response Time Trends
- `homepage_load_time` - Homepage rendering time
- `search_response_time` - Search API latency
- `equipment_detail_time` - Equipment detail API latency
- `lead_creation_time` - Lead creation API latency
- `auth_flow_time` - Complete auth flow (send OTP + verify)

### Error Rates
- `search_errors` - Search API failures
- `auth_errors` - Authentication failures
- `lead_errors` - Lead creation failures

### Request Counters
- `total_requests` - Total HTTP requests made
- `failed_requests` - Failed HTTP requests (4xx, 5xx)

## Interpreting Results

### Console Output

After running a test, k6 displays comprehensive results:

```
scenarios: (100.00%) 2 scenarios, 120 max VUs, 12m30s max duration
  ✓ normal_load
  ✓ authenticated_users

✓ Homepage status is 200
✓ Search response time < 1s
✗ Homepage loads in < 2.5s [98% pass]

http_req_duration...........: avg=324ms min=89ms med=276ms max=1.2s p(90)=512ms p(95)=648ms
http_req_failed.............: 2.34% ✓ 156 ✗ 6508
search_response_time........: avg=456ms min=123ms med=398ms max=1.8s p(90)=724ms p(95)=891ms
homepage_load_time..........: avg=1.2s min=456ms med=1.1s max=2.8s p(90)=1.9s p(95)=2.3s
```

### Key Metrics to Monitor

1. **http_req_duration (p95)**: 95% of requests should complete within budget
2. **http_req_failed**: Error rate should be < 5%
3. **Custom metrics**: Specific journey performance
4. **Checks**: Percentage of passing assertions

### Common Issues

**High error rates (> 5%)**
- Database connection pool exhausted
- Rate limiting triggered (check Upstash Redis limits)
- OTP verification failures (ensure mock OTP is enabled in dev)

**Slow response times**
- Database queries not optimized (add indexes)
- Missing cache implementation (Redis)
- N+1 query problems (use Prisma include)

**Failed checks**
- API contract changes (response structure)
- Missing data in test database
- Authentication token expiration

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/performance-test.yml`) runs automatically:

**Triggers:**
- On pull request to `main` branch
- Manual dispatch via GitHub UI
- Scheduled weekly runs (Monday 2 AM)

**Workflow:**
1. Set up PostgreSQL test database
2. Run migrations and seed data
3. Start Next.js server
4. Execute k6 load tests
5. Compare results against baselines
6. Fail PR if performance degrades > 20%
7. Upload test results as artifact

## Best Practices

### Before Testing

1. **Clean database state**: Run `npm run db:reset` to seed fresh test data
2. **Warm up server**: Let the dev server run for 1-2 minutes before testing
3. **Disable throttling**: Ensure your local network isn't throttled
4. **Close other apps**: Minimize CPU/memory interference

### During Testing

1. **Monitor resources**: Use `htop` or Activity Monitor to watch CPU/memory
2. **Check database**: Monitor PostgreSQL connections with `pg_stat_activity`
3. **Watch logs**: Tail Next.js logs for errors: `npm run dev | grep ERROR`

### After Testing

1. **Review custom metrics**: Don't just look at HTTP metrics, check journey-specific metrics
2. **Investigate failures**: If error rate > 1%, investigate logs immediately
3. **Compare baselines**: Track performance over time, not just pass/fail
4. **Document findings**: Add notes to PR if performance changes significantly

## Extending the Tests

### Add New User Journey

Edit `k6-load-test.js`:

```javascript
export function myCustomJourney() {
  group('My Feature', () => {
    const response = makeRequest('GET', `${API_URL}/my-endpoint`);

    check(response, {
      'My check passes': (r) => r.status === 200,
    });
  });
}
```

Add to `options.scenarios`:

```javascript
my_custom_scenario: {
  executor: 'ramping-vus',
  stages: [
    { duration: '2m', target: 10 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 0 },
  ],
  exec: 'myCustomJourney',
}
```

### Add Custom Metrics

```javascript
import { Trend } from 'k6/metrics';

const myMetric = new Trend('my_custom_metric');

// In your test
myMetric.add(response.timings.duration);
```

### Test with Real Data

For production-like testing, seed database with realistic data:

```bash
# Generate 10,000 equipment listings
npm run db:seed -- --count 10000

# Run test
npm run test:load
```

## Troubleshooting

### k6 not found
Install k6 following the prerequisites section above.

### Server not responding
Ensure `npm run dev` is running and accessible at `http://localhost:3000`.

### OTP verification fails
In development, the test uses mock OTP `123456`. Ensure your `/api/auth/otp/verify` route accepts this in `NODE_ENV=development`.

### Database connection errors
Check `DATABASE_URL` in `.env` and ensure PostgreSQL is running.

### High error rate (> 10%)
Your local setup may not handle 100+ concurrent users. Try reducing VUs:
```bash
k6 run --vus 20 --duration 2m tests/load/k6-load-test.js
```

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Web Performance Budgets](https://web.dev/performance-budgets-101/)
- [Core Web Vitals](https://web.dev/vitals/)

## Support

For questions or issues:
1. Check this README first
2. Review k6 documentation
3. Check GitHub Actions workflow logs
4. Ask in team chat with test results attached

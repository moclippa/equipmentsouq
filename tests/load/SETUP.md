# Load Testing Setup Guide

Complete guide to setting up and running performance tests for EquipmentSouq.

## Quick Start (5 minutes)

### 1. Install k6

**macOS:**
```bash
brew install k6
```

**Ubuntu/Debian:**
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

### 2. Prepare Test Environment

```bash
# Ensure database is running and seeded
npm run db:reset  # Resets and seeds database

# Start development server
npm run dev
```

### 3. Run Your First Load Test

```bash
# Run normal load test (100 concurrent users)
npm run test:load
```

You should see output like:
```
========================================
EquipmentSouq Load Test Starting
========================================

     ✓ Homepage status is 200
     ✓ Search response time < 1s
     ✓ Equipment detail response time < 500ms

     http_req_duration...........: avg=324ms min=89ms med=276ms max=1.2s p(95)=648ms
     http_req_failed.............: 2.34%
```

## Understanding Test Scenarios

The load test suite includes 4 main scenarios:

### 1. Normal Load (Default)
**Purpose:** Simulate typical daily traffic
**Profile:**
- Ramp up: 0 → 100 users over 5 minutes
- Sustain: 100 users for 5 minutes
- Ramp down: 100 → 0 over 2 minutes

**Run:**
```bash
npm run test:load
```

### 2. Spike Test
**Purpose:** Test system resilience to sudden traffic spikes (e.g., viral social media post, marketing campaign)
**Profile:**
- Normal: 100 users
- Spike: Sudden jump to 500 users for 2 minutes
- Recovery: Back to 100 users

**Run:**
```bash
npm run test:load:spike
```

### 3. Stress Test
**Purpose:** Find the breaking point of the system
**Profile:**
- Ramp up to 1000 concurrent users
- Sustain for 10 minutes

**Run:**
```bash
npm run test:load:stress
```

**Warning:** This test is resource-intensive and may cause temporary system degradation.

### 4. Soak Test
**Purpose:** Find memory leaks and performance degradation over time
**Profile:**
- 50 users continuously for 30 minutes

**Run:**
```bash
npm run test:load:soak
```

## What Gets Tested?

### Anonymous User Journey (80% of traffic)
Simulates users browsing without logging in:

1. **Homepage Load**
   - GET /
   - Budget: LCP < 2.5s (p95)

2. **Category Listing**
   - GET /api/categories
   - Budget: < 200ms (p95)

3. **Equipment Search**
   - GET /api/equipment?category=excavators&location=riyadh&listingType=FOR_RENT
   - Budget: < 1s (p95)

4. **Equipment Detail**
   - GET /api/equipment/[id]
   - Budget: < 500ms (p95)

### Authenticated User Journey (20% of traffic)
Simulates logged-in users creating contact requests:

1. **OTP Authentication**
   - POST /api/auth/otp/send
   - POST /api/auth/otp/verify
   - Budget: < 1s total (p95)

2. **Browse Equipment** (reuses anonymous journey)

3. **Lead Creation**
   - POST /api/leads
   - Budget: < 1s (p95)

## Reading Test Results

### HTTP Metrics

```
http_req_duration...........: avg=324ms min=89ms med=276ms max=1.2s p(90)=512ms p(95)=648ms
```

- **avg**: Average response time
- **min/max**: Fastest/slowest request
- **med**: Median (50% of requests faster than this)
- **p(90)**: 90th percentile (90% of requests faster than this)
- **p(95)**: 95th percentile - **MOST IMPORTANT METRIC**
- **p(99)**: 99th percentile - extreme outliers

**Good targets:**
- P95 < 500ms for API endpoints
- P95 < 1s for search
- P95 < 2.5s for page loads

### Error Rate

```
http_req_failed.............: 2.34% ✓ 156 ✗ 6508
```

- **2.34%**: Percentage of failed requests (4xx, 5xx errors)
- **✓ 156**: Failed requests count
- **✗ 6508**: Successful requests count

**Good targets:**
- < 1% for critical flows (auth, payments)
- < 5% for general traffic

### Custom Metrics

```
homepage_load_time..........: avg=1.2s min=456ms med=1.1s max=2.8s p(95)=2.3s
search_response_time........: avg=456ms min=123ms med=398ms max=1.8s p(95)=891ms
equipment_detail_time.......: avg=234ms min=89ms med=198ms max=678ms p(95)=445ms
```

These track specific user journeys for easier debugging.

### Checks (Assertions)

```
✓ Homepage status is 200........: 100.00%
✓ Search response time < 1s....: 98.50%
✗ Homepage loads in < 2.5s.....: 94.20%
```

- **Green checkmark (✓)**: Pass rate > 95%
- **Red X (✗)**: Pass rate < 95%
- **Percentage**: How many requests passed the check

## Performance Budgets

Performance budgets are defined in `performance-budgets.json`. They represent acceptable performance thresholds based on:

1. **Google Core Web Vitals** (LCP, FCP, FID, CLS)
2. **Industry standards** for marketplace platforms
3. **User experience research** (users abandon slow sites)

### Key Budgets

| Metric | Budget | Rationale |
|--------|--------|-----------|
| Homepage LCP | < 2.5s | Google "Good" threshold |
| API Response | < 500ms | Users perceive as "instant" |
| Search Results | < 1s | Acceptable for complex operations |
| Error Rate | < 5% | Industry standard for SaaS |

### Checking Budgets

After running a test:

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

## CI/CD Integration

The GitHub Actions workflow runs automatically on:

1. **Pull Requests** to main branch (if performance-related files changed)
2. **Manual dispatch** via GitHub UI
3. **Weekly schedule** (Mondays 2 AM UTC)

### Workflow Steps

1. Set up PostgreSQL test database
2. Install dependencies and k6
3. Run database migrations and seed
4. Build Next.js application
5. Start production server
6. Run load tests
7. Check performance budgets
8. Compare against baseline
9. Comment PR with results
10. Fail PR if budgets exceeded or regressions detected

### Baseline Comparison

The workflow compares PR performance against the `main` branch baseline:

```bash
node tests/load/compare-baseline.js \
  --baseline ./baseline-results/summary-normal.json \
  --current ./current-results/summary-normal.json \
  --threshold 20
```

**Threshold:** Fails if performance degrades > 20%

Example output:
```
HTTP Request Duration:
  P50: 198.45ms (-5.2%) 🎉  # 5% improvement
  P95: 456.78ms (+3.1%) ✅  # 3% degradation (acceptable)
  P99: 987.23ms (+25.4%) ❌ # 25% degradation (regression!)

❌ Performance regressions detected!
This PR introduces performance regressions. Please investigate.
```

## Troubleshooting

### High Error Rate (> 10%)

**Symptoms:** `http_req_failed` > 10%

**Possible causes:**
1. Database connection pool exhausted
2. Rate limiting triggered
3. Server running out of memory/CPU

**Solutions:**
```bash
# Check server logs
npm run dev | grep ERROR

# Check database connections
psql -U postgres -d equipmentsouq -c "SELECT count(*) FROM pg_stat_activity;"

# Reduce concurrent users
k6 run --vus 20 --duration 2m tests/load/k6-load-test.js
```

### Slow Response Times

**Symptoms:** P95 > 2s for most requests

**Possible causes:**
1. Missing database indexes
2. N+1 query problems
3. No caching implementation
4. Large response payloads

**Solutions:**
```bash
# Check slow queries (if query logging enabled)
tail -f /var/log/postgresql/postgresql.log | grep "duration:"

# Analyze Prisma queries
# Add this to your API route:
console.log('Query:', prisma.$on('query', (e) => console.log(e)))

# Check response sizes
k6 run --http-debug tests/load/k6-load-test.js | grep "response bytes"
```

### OTP Verification Fails

**Symptoms:** `auth_errors` > 50%

**Cause:** Test uses mock OTP `123456` which may not work in your environment

**Solution:**

Edit `/src/app/api/auth/otp/verify/route.ts`:

```typescript
// In development, accept mock OTP
if (process.env.NODE_ENV === 'development' && code === '123456') {
  // Accept mock OTP
}
```

### Database Connection Errors

**Symptoms:** `ECONNREFUSED` or `connection pool exhausted`

**Solutions:**
```bash
# Ensure PostgreSQL is running
docker ps | grep postgres

# Check connection string
echo $DATABASE_URL

# Increase connection pool (in schema.prisma)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connectionLimit = 100  # Increase this
}
```

### Server Not Starting

**Symptoms:** `wait-on` timeout in CI

**Solutions:**
```bash
# Check if port is already in use
lsof -i :3000

# Kill existing process
kill -9 $(lsof -t -i:3000)

# Start server with verbose logging
npm run dev -- --verbose
```

## Advanced Usage

### Testing Against Production

```bash
BASE_URL=https://equipmentsouq.com npm run test:load
```

**Warning:** Only run light tests against production. Use staging for stress tests.

### Customizing Virtual Users

```bash
# 50 VUs for 5 minutes
k6 run --vus 50 --duration 5m tests/load/k6-load-test.js

# Gradual ramp: 0 → 100 over 10min, sustain 100 for 20min
k6 run --stage 10m:100 --stage 20m:100 tests/load/k6-load-test.js
```

### Generating HTML Reports

```bash
# Run test with JSON output
k6 run --out json=results.json tests/load/k6-load-test.js

# Convert to HTML (requires k6 extensions)
docker run --rm -v $(pwd):/work -w /work \
  grafana/k6:latest \
  k6 run --out json=results.json tests/load/k6-load-test.js

# Or use k6-reporter (npm package)
npm install -g k6-reporter
k6-reporter results.json --output report.html
```

### Testing Specific Scenarios Only

```bash
# Only run normal user journey
k6 run --scenarios normal_load tests/load/k6-load-test.js

# Only run authenticated users
k6 run --scenarios authenticated_users tests/load/k6-load-test.js
```

### Adding Custom Test Data

Edit `k6-load-test.js`:

```javascript
// Add realistic search terms
const SAMPLE_CATEGORIES = [
  'excavators',
  'bulldozers',
  'tower-cranes',
  // Add more from your actual data
];

// Add real equipment IDs for testing
const EQUIPMENT_IDS = [
  'clx1234567890',
  'clx0987654321',
  // Get from database
];
```

## Monitoring During Tests

### System Resources

**Terminal 1: Run test**
```bash
npm run test:load
```

**Terminal 2: Monitor CPU/Memory**
```bash
# macOS
top -o cpu

# Linux
htop
```

**Terminal 3: Monitor Database**
```bash
watch -n 1 'psql -U postgres -d equipmentsouq -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"'
```

### Application Logs

```bash
# Next.js dev server logs
npm run dev | tee server.log

# Filter for errors during test
tail -f server.log | grep -i error
```

### Network Traffic

```bash
# Monitor network requests (macOS)
nettop -p $(pgrep -f "next dev")

# Linux
iftop -i lo  # Localhost traffic
```

## Best Practices

### Before Testing

1. **Clean state:** `npm run db:reset` for consistent results
2. **Warm up:** Let server run 1-2 min before testing
3. **Close apps:** Minimize CPU/memory interference
4. **Stable network:** Don't run on throttled/unstable connections

### During Testing

1. **Don't interrupt:** Let tests complete for accurate results
2. **Monitor resources:** Watch for CPU/memory/disk saturation
3. **Take notes:** Document any anomalies or errors

### After Testing

1. **Review all metrics:** Not just pass/fail
2. **Compare trends:** Is performance improving or degrading over time?
3. **Investigate failures:** Error rate > 1% warrants investigation
4. **Document changes:** Note performance impact in PR descriptions

## Next Steps

1. **Establish baseline:** Run tests on clean `main` branch
2. **Set up monitoring:** Integrate with Datadog, New Relic, or Grafana
3. **Regular testing:** Run weekly to catch regressions early
4. **Optimize:** Use test results to guide performance improvements

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [Performance Budgets Guide](https://web.dev/performance-budgets-101/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)

## Support

If you encounter issues:
1. Check this guide
2. Review k6 documentation
3. Check CI workflow logs
4. Ask in team chat with test results attached

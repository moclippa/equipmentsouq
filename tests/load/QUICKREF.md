# Load Testing Quick Reference

One-page reference for common load testing tasks.

## Installation

```bash
# macOS
brew install k6

# Ubuntu/Debian
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Windows
choco install k6
```

## Quick Start

```bash
npm run dev              # Start server
npm run test:load        # Run load test (100 users)
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run test:load` | Normal load (100 users, 5 min) |
| `npm run test:load:spike` | Spike test (500 users, 2 min) |
| `npm run test:load:stress` | Stress test (1000 users, 10 min) |
| `npm run test:load:soak` | Soak test (50 users, 30 min) |
| `npm run test:load:local` | Test localhost explicitly |

## Direct k6 Commands

```bash
# Basic test
k6 run tests/load/k6-load-test.js

# Custom VUs and duration
k6 run --vus 50 --duration 5m tests/load/k6-load-test.js

# Test production
BASE_URL=https://equipmentsouq.com k6 run tests/load/k6-load-test.js

# Generate JSON output
k6 run --out json=results.json tests/load/k6-load-test.js

# Run specific scenario only
k6 run --scenarios normal_load tests/load/k6-load-test.js
```

## Performance Budgets

| Metric | Target | Critical |
|--------|--------|----------|
| Homepage LCP | < 2.5s | < 4s |
| API Response (P95) | < 500ms | < 1s |
| Search (P95) | < 1s | < 2s |
| Error Rate | < 1% | < 5% |

## Reading Results

```
http_req_duration...........: avg=324ms min=89ms med=276ms max=1.2s p(95)=648ms
```

- **avg**: Average response time (324ms)
- **med**: Median / P50 (276ms)
- **p(95)**: 95th percentile - **KEY METRIC** (648ms)
- **max**: Slowest request (1.2s)

**Rule of thumb:**
- P95 < 500ms = Good
- P95 500-1000ms = Acceptable
- P95 > 1000ms = Needs optimization

```
http_req_failed.............: 2.34% ✓ 156 ✗ 6508
```

- **2.34%**: Error rate
- **✓ 156**: Failed requests
- **✗ 6508**: Successful requests

**Rule of thumb:**
- < 1% = Excellent
- 1-5% = Acceptable
- > 5% = Investigate

## Checking Budgets

```bash
node tests/load/check-budgets.js --summary summary-normal.json
```

## Comparing Performance

```bash
# Run baseline
npm run test:load
cp summary-normal.json baseline.json

# Make changes, run again
npm run test:load
cp summary-normal.json current.json

# Compare
node tests/load/compare-baseline.js \
  --baseline baseline.json \
  --current current.json \
  --threshold 20
```

## Troubleshooting

### High error rate (> 10%)
- Check server logs: `npm run dev | grep ERROR`
- Check database connections
- Reduce VUs: `k6 run --vus 20 tests/load/k6-load-test.js`

### Slow response times
- Missing database indexes?
- N+1 query problems?
- No caching?
- Check query logs

### OTP verification fails
- Ensure mock OTP `123456` is enabled in dev
- Check `/api/auth/otp/verify` route

### Database connection errors
- Is PostgreSQL running? `docker ps | grep postgres`
- Check `DATABASE_URL` in `.env`
- Increase connection pool in `schema.prisma`

## Test Scenarios

### Normal Load (Default)
- **Profile**: 0 → 100 users over 5 min, sustain 5 min
- **Purpose**: Daily traffic simulation
- **Run**: `npm run test:load`

### Spike Test
- **Profile**: 100 → 500 users sudden spike, 2 min
- **Purpose**: Viral traffic / marketing campaign
- **Run**: `npm run test:load:spike`

### Stress Test
- **Profile**: 1000 concurrent users, 10 min
- **Purpose**: Find breaking point
- **Run**: `npm run test:load:stress`

### Soak Test
- **Profile**: 50 users, 30 min continuous
- **Purpose**: Find memory leaks
- **Run**: `npm run test:load:soak`

## What Gets Tested

### Anonymous Users (80%)
1. Homepage load
2. Category listing
3. Equipment search
4. Equipment detail

### Authenticated Users (20%)
1. OTP authentication
2. Browse equipment
3. Create lead (contact request)

## Monitoring During Tests

```bash
# Terminal 1: Run test
npm run test:load

# Terminal 2: Monitor CPU/Memory
htop  # or 'top' on macOS

# Terminal 3: Monitor database
watch -n 2 'psql -U postgres -d equipmentsouq -c "SELECT count(*) FROM pg_stat_activity WHERE state = '\''active'\'';"'

# Terminal 4: Watch logs
npm run dev | tee server.log
tail -f server.log | grep ERROR
```

## CI/CD Integration

Tests run automatically on:
- Pull requests to `main` (if performance files changed)
- Manual dispatch via GitHub UI
- Weekly schedule (Mondays 2 AM UTC)

**Workflow:**
1. Set up test database
2. Run migrations and seed
3. Build Next.js
4. Run load tests
5. Check budgets
6. Compare against baseline
7. Comment PR with results
8. Fail if budgets exceeded

## Files Overview

| File | Purpose |
|------|---------|
| `k6-load-test.js` | Main load test script |
| `performance-budgets.json` | Performance thresholds |
| `check-budgets.js` | Validates against budgets |
| `compare-baseline.js` | Detects regressions |
| `README.md` | Comprehensive documentation |
| `SETUP.md` | Installation and setup guide |
| `EXAMPLES.md` | Real-world usage examples |
| `QUICKREF.md` | This file |

## Key Metrics to Watch

1. **http_req_duration (P95)** - Response time for 95% of requests
2. **http_req_failed** - Error rate percentage
3. **homepage_load_time (P95)** - Homepage performance
4. **search_response_time (P95)** - Search API performance
5. **equipment_detail_time (P95)** - Detail API performance
6. **iterations** - Total completed user journeys

## Success Criteria

**Pass if ALL of:**
- Error rate < 5%
- Homepage LCP (P95) < 2.5s
- API response (P95) < 500ms
- Search (P95) < 1s
- No regressions > 20% vs baseline

**Investigate if ANY of:**
- Error rate > 5%
- P95 response time > 2s
- Memory grows continuously (leak)
- Throughput drops significantly

## Best Practices

**Before testing:**
- ✓ Clean database state (`npm run db:reset`)
- ✓ Warm up server (1-2 min)
- ✓ Close resource-heavy apps
- ✓ Stable network connection

**During testing:**
- ✓ Don't interrupt tests
- ✓ Monitor system resources
- ✓ Take notes on anomalies

**After testing:**
- ✓ Review all metrics
- ✓ Compare trends over time
- ✓ Investigate errors
- ✓ Document findings

## Resources

- **Setup Guide**: [SETUP.md](./SETUP.md)
- **Examples**: [EXAMPLES.md](./EXAMPLES.md)
- **k6 Docs**: https://k6.io/docs/
- **Web Vitals**: https://web.dev/vitals/

## Quick Tips

- Use `--quiet` for less verbose output: `k6 run --quiet`
- Use `--http-debug` to see full HTTP logs: `k6 run --http-debug`
- Test in production mode for accurate results: `npm run build && npm start`
- Save results: `k6 run tests/load/k6-load-test.js | tee results.txt`
- Monitor memory: `watch -n 5 'ps aux | grep node'`

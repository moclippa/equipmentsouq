# Load Testing Examples

Practical examples for running and analyzing performance tests.

## Example 1: Quick Local Test

**Scenario:** You want to quickly check if your changes affected performance.

```bash
# 1. Start development server
npm run dev

# 2. In another terminal, run a short load test
k6 run --vus 20 --duration 2m tests/load/k6-load-test.js
```

**Expected output:**
```
running (2m03.5s), 00/20 VUs, 4523 complete and 0 interrupted iterations

✓ Homepage status is 200
✓ Search response time < 1s
✓ Equipment detail response time < 500ms

http_req_duration...........: avg=245ms min=78ms med=198ms max=987ms p(95)=567ms
http_req_failed.............: 1.2%
```

**Interpretation:**
- **4523 iterations:** In 2 minutes, 20 users completed 4523 full journeys
- **P95 567ms:** 95% of requests completed in < 567ms (within budget)
- **1.2% error rate:** Within acceptable range (< 5%)

**Result:** ✅ Performance is acceptable for this change.

---

## Example 2: Testing After Database Optimization

**Scenario:** You added indexes to the equipment table and want to verify improvement.

```bash
# 1. Establish baseline BEFORE optimization
npm run test:load
cp summary-normal.json baseline-before.json

# 2. Apply your database changes
# Add indexes, optimize queries, etc.

# 3. Run test again AFTER optimization
npm run test:load
cp summary-normal.json baseline-after.json

# 4. Compare results
node tests/load/compare-baseline.js \
  --baseline baseline-before.json \
  --current baseline-after.json \
  --threshold 5  # Stricter threshold to detect improvements
```

**Expected output:**
```
========================================
Performance Regression Check
========================================

HTTP Request Duration:
  P50: 198.45ms (-25.3%) 🎉
  P95: 456.78ms (-32.1%) 🎉
  P99: 987.23ms (-28.7%) 🎉

Equipment Search:
  P95: 234.56ms (-45.8%) 🎉

Summary:
  Regressions: 0
  Improvements: 4
========================================

✅ No performance regressions detected!

🎉 4 metric(s) improved:
  - P50: 265.34ms → 198.45ms (-25.3%)
  - P95: 672.15ms → 456.78ms (-32.1%)
  - P99: 1387.92ms → 987.23ms (-28.7%)
  - Search P95: 432.87ms → 234.56ms (-45.8%)
```

**Interpretation:**
- **25-45% improvement** across all metrics
- Search performance improved dramatically (45%)
- Your optimization worked!

**Result:** ✅ Merge with confidence, this is a major performance win.

---

## Example 3: Pre-deployment Stress Test

**Scenario:** Before deploying to production, you want to ensure the system can handle peak traffic.

```bash
# 1. Build production version
npm run build

# 2. Start production server
npm start

# 3. In another terminal, run stress test
npm run test:load:stress
```

**Expected output (healthy system):**
```
scenarios: (100.00%) 1 scenarios, 1000 max VUs, 12m30s max duration

✓ Homepage status is 200
✓ Search response time < 1s
✓ Equipment detail response time < 500ms

http_req_duration...........: avg=678ms min=89ms med=567ms max=3.2s p(95)=1.1s
http_req_failed.............: 3.45%
iterations..................: 45,231
```

**Expected output (system under strain):**
```
scenarios: (100.00%) 1 scenarios, 1000 max VUs, 12m30s max duration

✗ Homepage status is 200 [89% pass]
✗ Search response time < 1s [78% pass]
✓ Equipment detail response time < 500ms

http_req_duration...........: avg=1.8s min=234ms med=1.2s max=8.7s p(95)=3.4s
http_req_failed.............: 11.2%  ❌
iterations..................: 28,945
```

**Interpretation of bad results:**
- **11.2% error rate:** System is overwhelmed
- **P95 3.4s:** Response times degraded significantly
- **28,945 iterations:** Throughput dropped vs healthy baseline (45,231)

**Actions:**
1. Check database connection pool (likely exhausted at 1000 users)
2. Enable Redis caching to reduce database load
3. Consider horizontal scaling (multiple instances)
4. Add rate limiting to prevent abuse

**Result:** ❌ DO NOT DEPLOY until issues are resolved.

---

## Example 4: Finding Memory Leaks

**Scenario:** Users report the site gets slower over time. Run a soak test to find memory leaks.

```bash
# 1. Start server and note initial memory
npm run dev
# Note memory: ~450MB

# 2. Run soak test (30 minutes)
npm run test:load:soak

# 3. Monitor memory during test
# In another terminal:
watch -n 10 'ps aux | grep "next dev"'
```

**Expected output (healthy - no leak):**
```
Time    Memory
0min    450MB
10min   520MB  # Initial ramp-up
20min   530MB  # Stabilized
30min   535MB  # Minimal growth
```

**Expected output (memory leak detected):**
```
Time    Memory
0min    450MB
10min   580MB
20min   780MB  # Growing steadily
30min   1.1GB  # LEAK DETECTED
```

**Interpretation of leak:**
- Memory grew from 450MB → 1.1GB in 30 minutes
- At this rate, process will crash in ~2 hours
- Clear memory leak in long-running process

**Debugging steps:**
```bash
# 1. Enable Node.js memory profiling
node --inspect node_modules/.bin/next dev

# 2. Open Chrome DevTools: chrome://inspect
# 3. Take heap snapshots at 0min, 15min, 30min
# 4. Compare snapshots to find retained objects

# 5. Common causes in Next.js:
# - Event listeners not cleaned up (useEffect missing cleanup)
# - Global caches growing unbounded
# - Database connections not closed
# - Large objects stored in React state
```

**Result:** ❌ Memory leak found, needs investigation before deployment.

---

## Example 5: Testing API Endpoint Changes

**Scenario:** You refactored the search API and want to ensure it's still performant.

```bash
# Create a minimal test that focuses only on search
cat > tests/load/search-only.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 50,
  duration: '3m',
  thresholds: {
    'http_req_duration': ['p(95)<1000'],
  },
};

export default function() {
  const categories = ['excavators', 'bulldozers', 'cranes'];
  const locations = ['riyadh', 'jeddah', 'dammam'];

  const category = categories[Math.floor(Math.random() * categories.length)];
  const location = locations[Math.floor(Math.random() * locations.length)];

  const url = `http://localhost:3000/api/equipment?category=${category}&location=${location}&page=1&limit=20`;

  const response = http.get(url);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1s': (r) => r.timings.duration < 1000,
  });
}
EOF

# Run focused test
k6 run tests/load/search-only.js
```

**Expected output:**
```
✓ status is 200
✓ response time < 1s

http_req_duration...........: avg=456ms min=123ms med=398ms max=987ms p(95)=678ms
http_reqs...................: 8,234 (45/s)

✓ All thresholds passed
```

**Interpretation:**
- **45 req/s throughput:** System handles 45 search requests per second
- **P95 678ms:** 95% of searches complete in < 1s
- **0% error rate:** All requests successful

**Result:** ✅ Search API refactoring maintained performance.

---

## Example 6: Testing Under Rate Limits

**Scenario:** You want to verify rate limiting doesn't affect legitimate users.

```bash
# 1. Configure rate limit (in your API route)
# Example: 100 requests per minute per IP

# 2. Run test with moderate load
k6 run --vus 30 --duration 2m tests/load/k6-load-test.js
```

**Expected output (rate limit NOT triggered):**
```
http_req_failed.............: 0.5%  # Normal error rate
iterations..................: 5,234
```

**Expected output (rate limit TRIGGERED):**
```
http_req_failed.............: 45.2%  ❌ # Many 429 errors
http_reqs...................: 4,567
  - 200: 2,501
  - 429: 2,066  # Rate limited
```

**Interpretation:**
- **45% error rate:** Rate limit is too strict
- **2,066 rate limit hits:** Legitimate users are being blocked

**Actions:**
1. Increase rate limit threshold (e.g., 100 → 200 req/min)
2. Use sliding window instead of fixed window
3. Whitelist authenticated users from rate limiting
4. Add burst allowance for temporary spikes

**Result:** ❌ Rate limit too aggressive, adjust before deployment.

---

## Example 7: Testing New Feature Impact

**Scenario:** You added image optimization middleware and want to measure impact.

```bash
# 1. Test BEFORE adding feature
git checkout main
npm run test:load
mv summary-normal.json baseline-before-images.json

# 2. Switch to feature branch
git checkout feature/image-optimization
npm run test:load
mv summary-normal.json baseline-after-images.json

# 3. Compare
node tests/load/compare-baseline.js \
  --baseline baseline-before-images.json \
  --current baseline-after-images.json \
  --threshold 10
```

**Expected output (feature improves performance):**
```
Homepage Load Time:
  P95: 2.8s → 1.9s (-32.1%) 🎉

HTTP Request Duration:
  P95: 567ms → 498ms (-12.2%) 🎉

Summary:
  Improvements: 2
```

**Expected output (feature degrades performance):**
```
Homepage Load Time:
  P95: 1.8s → 2.6s (+44.4%) ❌

HTTP Request Duration:
  P95: 456ms → 689ms (+51.1%) ❌

Summary:
  Regressions: 2

❌ Performance regressions detected!
```

**Interpretation of bad results:**
- Image optimization added significant overhead
- Middleware may be processing images synchronously (blocking)
- Need to investigate why optimization is slower

**Debugging:**
```javascript
// Add timing logs to middleware
console.time('image-optimization');
await optimizeImage(buffer);
console.timeEnd('image-optimization');
// image-optimization: 1.2s  ❌ TOO SLOW
```

**Fix:**
```javascript
// Move to background processing
await queueImageOptimization(buffer);
// Returns immediately, optimization happens async
```

**Result:** ❌ Feature needs optimization before merge.

---

## Example 8: Continuous Monitoring

**Scenario:** You want to track performance over time to detect gradual degradation.

```bash
# Create a script to run daily and store results
cat > tests/load/daily-monitor.sh << 'EOF'
#!/bin/bash

DATE=$(date +%Y-%m-%d)
RESULTS_DIR="tests/load/history"

mkdir -p $RESULTS_DIR

# Run test
k6 run \
  --out json="$RESULTS_DIR/results-$DATE.json" \
  --summary-export="$RESULTS_DIR/summary-$DATE.json" \
  tests/load/k6-load-test.js

# Check budgets
node tests/load/check-budgets.js \
  --summary "$RESULTS_DIR/summary-$DATE.json" \
  > "$RESULTS_DIR/budget-check-$DATE.txt"

# Compare with last week
LAST_WEEK=$(date -d '7 days ago' +%Y-%m-%d)
if [ -f "$RESULTS_DIR/summary-$LAST_WEEK.json" ]; then
  node tests/load/compare-baseline.js \
    --baseline "$RESULTS_DIR/summary-$LAST_WEEK.json" \
    --current "$RESULTS_DIR/summary-$DATE.json" \
    --threshold 15 \
    > "$RESULTS_DIR/weekly-comparison-$DATE.txt"
fi

echo "Results saved to $RESULTS_DIR/"
EOF

chmod +x tests/load/daily-monitor.sh

# Add to crontab (run daily at 2 AM)
crontab -e
# Add line:
# 0 2 * * * cd /path/to/equipmentsouq && ./tests/load/daily-monitor.sh
```

**Result:** Automated performance monitoring catches regressions early.

---

## Common Scenarios & Quick Commands

### "Is my API change fast enough?"
```bash
k6 run --vus 50 --duration 2m tests/load/k6-load-test.js
```

### "Can the system handle Black Friday traffic?"
```bash
npm run test:load:spike
```

### "Will we have memory leaks in production?"
```bash
npm run test:load:soak
# Monitor memory usage for 30 minutes
```

### "Did my optimization work?"
```bash
# Before optimization
npm run test:load && cp summary-normal.json before.json

# After optimization
npm run test:load && cp summary-normal.json after.json

# Compare
node tests/load/compare-baseline.js --baseline before.json --current after.json --threshold 5
```

### "What's the maximum load we can handle?"
```bash
npm run test:load:stress
# Watch for where error rate exceeds 10%
```

### "Is caching working?"
```bash
# First run (cold cache)
k6 run --vus 10 --duration 1m tests/load/k6-load-test.js

# Second run (warm cache)
k6 run --vus 10 --duration 1m tests/load/k6-load-test.js
# Should be faster if caching works
```

## Tips & Tricks

### Run tests in Docker (consistent environment)
```bash
docker run --rm -i --network=host grafana/k6:latest \
  run - < tests/load/k6-load-test.js
```

### Generate pretty reports
```bash
k6 run --out json=results.json tests/load/k6-load-test.js
cat results.json | jq '.metrics | to_entries[] | select(.value.type == "trend") | {name: .key, avg: .value.values.avg, p95: .value.values["p(95)"]}'
```

### Monitor during test
```bash
# Terminal 1: Run test
npm run test:load

# Terminal 2: Watch database
watch -n 2 'psql -U postgres -d equipmentsouq -c "SELECT count(*) FROM pg_stat_activity WHERE state = '\''active'\'';"'

# Terminal 3: Watch memory
watch -n 2 'ps aux | grep node | grep -v grep | awk '\''{print $6/1024 " MB"}'\'''
```

### Save test history
```bash
k6 run tests/load/k6-load-test.js | tee "results-$(date +%Y%m%d-%H%M%S).txt"
```

## Further Reading

- [k6 Examples Repository](https://github.com/grafana/k6/tree/master/examples)
- [Load Testing Best Practices](https://k6.io/docs/test-types/load-test/)
- [Performance Testing Guide](https://web.dev/rail/)

# Getting Started with Load Testing

5-minute guide to running your first load test on EquipmentSouq.

## Prerequisites

You need:
- EquipmentSouq codebase
- Node.js installed
- PostgreSQL running

## Step 1: Install k6 (2 minutes)

**macOS:**
```bash
brew install k6
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install k6
```

**Windows:**
```bash
choco install k6
```

**Verify installation:**
```bash
k6 version
# Should output: k6 v0.xx.x
```

## Step 2: Prepare Environment (1 minute)

```bash
cd /path/to/equipmentsouq

# Ensure database has test data
npm run db:reset

# Start development server
npm run dev
```

Server should be running at `http://localhost:3000`

## Step 3: Run Your First Load Test (2 minutes)

```bash
# In a new terminal (keep dev server running)
npm run test:load
```

You'll see output like:
```
========================================
EquipmentSouq Load Test Starting
========================================
Base URL: http://localhost:3000
Scenario: normal
========================================
Server health check passed ✓

running (12m03.5s), 000/100 VUs, 4,523 complete iterations

✓ Homepage status is 200
✓ Search response time < 1s
✓ Equipment detail response time < 500ms

checks........................: 98.50%
http_req_duration..............: avg=324ms min=89ms med=276ms max=1.2s p(95)=648ms
http_req_failed................: 2.34%
http_reqs......................: 6,664 (9.2/s)
iterations.....................: 4,523

homepage_load_time.............: avg=1.2s p(95)=2.3s
search_response_time...........: avg=456ms p(95)=891ms
equipment_detail_time..........: avg=234ms p(95)=445ms
```

## Understanding Your Results

### Key Metrics to Look At

**1. Error Rate (http_req_failed)**
```
http_req_failed................: 2.34%
```
- Good: < 1%
- Acceptable: 1-5%
- Bad: > 5%

**2. Response Time (p95)**
```
http_req_duration..............: p(95)=648ms
```
- Good: < 500ms
- Acceptable: 500-1000ms
- Bad: > 1000ms

**3. Throughput**
```
http_reqs......................: 6,664 (9.2/s)
```
- This means your system handled 9.2 requests per second
- Higher is better

### What Does Success Look Like?

✅ **Good Test Results:**
- Error rate < 5%
- P95 response time < 1s
- All checks passing (✓)
- No server crashes

❌ **Bad Test Results:**
- Error rate > 10%
- P95 response time > 2s
- Many checks failing (✗)
- Server becomes unresponsive

## What's Being Tested?

The load test simulates **100 real users** for **5 minutes**, each doing:

1. **Visit homepage**
2. **Browse categories**
3. **Search for equipment** (with filters)
4. **View equipment details**
5. **(Some users) Login and create leads**

## Next Steps

### Run Different Test Types

**Spike test** (sudden traffic spike):
```bash
npm run test:load:spike
```

**Stress test** (find breaking point):
```bash
npm run test:load:stress
```

**Soak test** (find memory leaks):
```bash
npm run test:load:soak
```

### Check Performance Budgets

```bash
# After running a test
node tests/load/check-budgets.js --summary summary-normal.json
```

### Compare Before/After Optimization

```bash
# Before your changes
npm run test:load
cp summary-normal.json baseline.json

# After your changes
npm run test:load
cp summary-normal.json current.json

# Compare
node tests/load/compare-baseline.js \
  --baseline baseline.json \
  --current current.json \
  --threshold 20
```

## Common Issues

### "k6: command not found"
Install k6 following Step 1 above.

### "Server not responding" errors
Ensure `npm run dev` is running in another terminal.

### High error rate (> 10%)
Your local machine might not handle 100 concurrent users. Try:
```bash
k6 run --vus 20 --duration 2m tests/load/k6-load-test.js
```

### Database connection errors
Check if PostgreSQL is running:
```bash
docker ps | grep postgres
# or
pg_isready
```

## Learn More

**Quick reference** (1 page):
```bash
cat tests/load/QUICKREF.md
```

**Full documentation**:
- `tests/load/README.md` - Overview
- `tests/load/SETUP.md` - Installation guide
- `tests/load/EXAMPLES.md` - Real-world examples
- `docs/LOAD_TESTING.md` - Complete reference

## Help

If you're stuck:
1. Check `tests/load/SETUP.md` troubleshooting section
2. Review [k6 documentation](https://k6.io/docs/)
3. Ask in team chat

---

**Congratulations!** You've run your first load test. Now you can:
- Test performance before merging PRs
- Validate optimizations work
- Find bottlenecks in your code
- Ensure the platform stays fast as it grows

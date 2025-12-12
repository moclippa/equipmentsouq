#!/usr/bin/env node

/**
 * Performance Budget Checker
 *
 * Compares k6 test results against defined performance budgets.
 * Exits with code 1 if any budgets are exceeded.
 *
 * Usage:
 *   node check-budgets.js [--summary summary.json] [--budgets budgets.json]
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const summaryFile = args[args.indexOf('--summary') + 1] || 'summary-normal.json';
const budgetsFile = args[args.indexOf('--budgets') + 1] || path.join(__dirname, 'performance-budgets.json');

// Load files
if (!fs.existsSync(summaryFile)) {
  console.error(`Error: Summary file not found: ${summaryFile}`);
  process.exit(1);
}

if (!fs.existsSync(budgetsFile)) {
  console.error(`Error: Budgets file not found: ${budgetsFile}`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
const budgets = JSON.parse(fs.readFileSync(budgetsFile, 'utf8'));

console.log('========================================');
console.log('Performance Budget Check');
console.log('========================================\n');

let budgetsPassed = 0;
let budgetsFailed = 0;
const violations = [];

// Extract metrics from k6 summary
const metrics = summary.metrics;

// Check API endpoint budgets
const apiGeneralBudget = budgets.budgets.find(b => b.name === 'API Endpoints - General');
if (apiGeneralBudget && metrics.http_req_duration) {
  console.log('API Endpoints - General:');

  // P50 check
  const p50 = metrics.http_req_duration.values['p(50)'];
  const p50Budget = apiGeneralBudget.metrics.ResponseTime_P50.value;
  const p50Pass = p50 <= p50Budget;

  console.log(`  P50: ${p50.toFixed(2)}ms / ${p50Budget}ms ${p50Pass ? '✅' : '❌'}`);
  p50Pass ? budgetsPassed++ : budgetsFailed++;

  if (!p50Pass) {
    violations.push({
      metric: 'API P50',
      actual: p50,
      budget: p50Budget,
      unit: 'ms',
    });
  }

  // P95 check
  const p95 = metrics.http_req_duration.values['p(95)'];
  const p95Budget = apiGeneralBudget.metrics.ResponseTime_P95.value;
  const p95Pass = p95 <= p95Budget;

  console.log(`  P95: ${p95.toFixed(2)}ms / ${p95Budget}ms ${p95Pass ? '✅' : '❌'}`);
  p95Pass ? budgetsPassed++ : budgetsFailed++;

  if (!p95Pass) {
    violations.push({
      metric: 'API P95',
      actual: p95,
      budget: p95Budget,
      unit: 'ms',
    });
  }

  // P99 check
  const p99 = metrics.http_req_duration.values['p(99)'];
  const p99Budget = apiGeneralBudget.metrics.ResponseTime_P99.value;
  const p99Pass = p99 <= p99Budget;

  console.log(`  P99: ${p99.toFixed(2)}ms / ${p99Budget}ms ${p99Pass ? '✅' : '❌'}`);
  p99Pass ? budgetsPassed++ : budgetsFailed++;

  if (!p99Pass) {
    violations.push({
      metric: 'API P99',
      actual: p99,
      budget: p99Budget,
      unit: 'ms',
    });
  }

  // Error rate check
  const errorRate = metrics.http_req_failed.values.rate * 100;
  const errorBudget = apiGeneralBudget.metrics.ErrorRate.value;
  const errorPass = errorRate <= errorBudget;

  console.log(`  Error Rate: ${errorRate.toFixed(2)}% / ${errorBudget}% ${errorPass ? '✅' : '❌'}\n`);
  errorPass ? budgetsPassed++ : budgetsFailed++;

  if (!errorPass) {
    violations.push({
      metric: 'API Error Rate',
      actual: errorRate,
      budget: errorBudget,
      unit: '%',
    });
  }
}

// Check homepage budget
const homepageBudget = budgets.budgets.find(b => b.name === 'Homepage');
if (homepageBudget && metrics.homepage_load_time) {
  console.log('Homepage:');

  const lcp = metrics.homepage_load_time.values['p(95)'];
  const lcpBudget = homepageBudget.metrics.LCP.value;
  const lcpPass = lcp <= lcpBudget;

  console.log(`  LCP (P95): ${lcp.toFixed(2)}ms / ${lcpBudget}ms ${lcpPass ? '✅' : '❌'}\n`);
  lcpPass ? budgetsPassed++ : budgetsFailed++;

  if (!lcpPass) {
    violations.push({
      metric: 'Homepage LCP',
      actual: lcp,
      budget: lcpBudget,
      unit: 'ms',
    });
  }
}

// Check search budget
const searchBudget = budgets.budgets.find(b => b.name === 'API - Equipment Search');
if (searchBudget && metrics.search_response_time) {
  console.log('Equipment Search:');

  const searchP95 = metrics.search_response_time.values['p(95)'];
  const searchBudgetP95 = searchBudget.metrics.ResponseTime_P95.value;
  const searchPass = searchP95 <= searchBudgetP95;

  console.log(`  P95: ${searchP95.toFixed(2)}ms / ${searchBudgetP95}ms ${searchPass ? '✅' : '❌'}\n`);
  searchPass ? budgetsPassed++ : budgetsFailed++;

  if (!searchPass) {
    violations.push({
      metric: 'Search P95',
      actual: searchP95,
      budget: searchBudgetP95,
      unit: 'ms',
    });
  }
}

// Check equipment detail budget
const equipmentBudget = budgets.budgets.find(b => b.name === 'API - Equipment Detail');
if (equipmentBudget && metrics.equipment_detail_time) {
  console.log('Equipment Detail:');

  const detailP95 = metrics.equipment_detail_time.values['p(95)'];
  const detailBudgetP95 = equipmentBudget.metrics.ResponseTime_P95.value;
  const detailPass = detailP95 <= detailBudgetP95;

  console.log(`  P95: ${detailP95.toFixed(2)}ms / ${detailBudgetP95}ms ${detailPass ? '✅' : '❌'}\n`);
  detailPass ? budgetsPassed++ : budgetsFailed++;

  if (!detailPass) {
    violations.push({
      metric: 'Equipment Detail P95',
      actual: detailP95,
      budget: detailBudgetP95,
      unit: 'ms',
    });
  }
}

// Summary
console.log('========================================');
console.log('Summary:');
console.log(`  Passed: ${budgetsPassed}`);
console.log(`  Failed: ${budgetsFailed}`);
console.log('========================================\n');

// Write results to file for CI
const results = {
  passed: budgetsPassed,
  failed: budgetsFailed,
  violations: violations,
  status: budgetsFailed === 0 ? 'PASS' : 'FAIL',
  timestamp: new Date().toISOString(),
};

fs.writeFileSync('budget-check-results.json', JSON.stringify(results, null, 2));
console.log('Results saved to budget-check-results.json');

// Exit with error if budgets failed
if (budgetsFailed > 0) {
  console.error('\n❌ Performance budgets exceeded!');
  console.error('\nViolations:');
  violations.forEach(v => {
    console.error(`  - ${v.metric}: ${v.actual.toFixed(2)}${v.unit} (budget: ${v.budget}${v.unit})`);
  });
  process.exit(1);
} else {
  console.log('\n✅ All performance budgets passed!');
  process.exit(0);
}

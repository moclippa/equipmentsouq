#!/usr/bin/env node

/**
 * Performance Baseline Comparison
 *
 * Compares current test results against a baseline to detect performance regressions.
 * Fails if performance degrades beyond a threshold percentage.
 *
 * Usage:
 *   node compare-baseline.js --baseline baseline.json --current current.json --threshold 20
 */

const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const baselineFile = args[args.indexOf('--baseline') + 1];
const currentFile = args[args.indexOf('--current') + 1];
const threshold = parseFloat(args[args.indexOf('--threshold') + 1] || 20);

if (!baselineFile || !currentFile) {
  console.error('Usage: node compare-baseline.js --baseline <file> --current <file> [--threshold <percent>]');
  process.exit(1);
}

// Load files
if (!fs.existsSync(baselineFile)) {
  console.log('No baseline found, skipping comparison');
  process.exit(0);
}

if (!fs.existsSync(currentFile)) {
  console.error(`Error: Current results file not found: ${currentFile}`);
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
const current = JSON.parse(fs.readFileSync(currentFile, 'utf8'));

console.log('========================================');
console.log('Performance Regression Check');
console.log('========================================');
console.log(`Threshold: ${threshold}% degradation\n`);

let regressions = [];
let improvements = [];

/**
 * Compare a metric between baseline and current
 */
function compareMetric(name, baselineValue, currentValue, lowerIsBetter = true) {
  if (!baselineValue || !currentValue) {
    console.log(`  ${name}: No data (baseline: ${baselineValue}, current: ${currentValue})`);
    return null;
  }

  const change = ((currentValue - baselineValue) / baselineValue) * 100;
  const isRegression = lowerIsBetter ? change > threshold : change < -threshold;
  const isImprovement = lowerIsBetter ? change < -5 : change > 5;

  const status = isRegression ? '❌' : isImprovement ? '🎉' : '✅';
  const changeStr = change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;

  console.log(`  ${name}: ${currentValue.toFixed(2)}ms (${changeStr}) ${status}`);

  if (isRegression) {
    regressions.push({
      metric: name,
      baseline: baselineValue,
      current: currentValue,
      change: change,
    });
  } else if (isImprovement) {
    improvements.push({
      metric: name,
      baseline: baselineValue,
      current: currentValue,
      change: change,
    });
  }

  return { name, baseline: baselineValue, current: currentValue, change };
}

// Compare HTTP duration
if (baseline.metrics.http_req_duration && current.metrics.http_req_duration) {
  console.log('HTTP Request Duration:');

  compareMetric(
    'P50',
    baseline.metrics.http_req_duration.values['p(50)'],
    current.metrics.http_req_duration.values['p(50)']
  );

  compareMetric(
    'P95',
    baseline.metrics.http_req_duration.values['p(95)'],
    current.metrics.http_req_duration.values['p(95)']
  );

  compareMetric(
    'P99',
    baseline.metrics.http_req_duration.values['p(99)'],
    current.metrics.http_req_duration.values['p(99)']
  );

  console.log('');
}

// Compare homepage load time
if (baseline.metrics.homepage_load_time && current.metrics.homepage_load_time) {
  console.log('Homepage Load Time:');

  compareMetric(
    'P95',
    baseline.metrics.homepage_load_time.values['p(95)'],
    current.metrics.homepage_load_time.values['p(95)']
  );

  console.log('');
}

// Compare search response time
if (baseline.metrics.search_response_time && current.metrics.search_response_time) {
  console.log('Search Response Time:');

  compareMetric(
    'P95',
    baseline.metrics.search_response_time.values['p(95)'],
    current.metrics.search_response_time.values['p(95)']
  );

  console.log('');
}

// Compare equipment detail time
if (baseline.metrics.equipment_detail_time && current.metrics.equipment_detail_time) {
  console.log('Equipment Detail Time:');

  compareMetric(
    'P95',
    baseline.metrics.equipment_detail_time.values['p(95)'],
    current.metrics.equipment_detail_time.values['p(95)']
  );

  console.log('');
}

// Compare error rates
if (baseline.metrics.http_req_failed && current.metrics.http_req_failed) {
  console.log('Error Rate:');

  const baselineErrorRate = baseline.metrics.http_req_failed.values.rate * 100;
  const currentErrorRate = current.metrics.http_req_failed.values.rate * 100;

  compareMetric('HTTP Failures', baselineErrorRate, currentErrorRate, true);

  console.log('');
}

// Summary
console.log('========================================');
console.log('Summary:');
console.log(`  Regressions: ${regressions.length}`);
console.log(`  Improvements: ${improvements.length}`);
console.log('========================================\n');

// Write comparison report
const report = {
  baseline: baselineFile,
  current: currentFile,
  threshold: threshold,
  regressions: regressions,
  improvements: improvements,
  timestamp: new Date().toISOString(),
};

fs.writeFileSync('comparison-report.json', JSON.stringify(report, null, 2));
console.log('Comparison report saved to comparison-report.json');

// Exit with error if regressions detected
if (regressions.length > 0) {
  console.error('\n❌ Performance regressions detected!');
  console.error(`\n${regressions.length} metric(s) degraded by more than ${threshold}%:\n`);

  regressions.forEach(r => {
    console.error(`  - ${r.metric}: ${r.baseline.toFixed(2)}ms → ${r.current.toFixed(2)}ms (${r.change.toFixed(1)}%)`);
  });

  console.error('\nThis PR introduces performance regressions. Please investigate and optimize before merging.');
  process.exit(1);
} else {
  console.log('\n✅ No performance regressions detected!');

  if (improvements.length > 0) {
    console.log(`\n🎉 ${improvements.length} metric(s) improved:\n`);
    improvements.forEach(i => {
      console.log(`  - ${i.metric}: ${i.baseline.toFixed(2)}ms → ${i.current.toFixed(2)}ms (${i.change.toFixed(1)}%)`);
    });
  }

  process.exit(0);
}

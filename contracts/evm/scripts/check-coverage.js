#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../coverage/coverage-summary.json');
if (!fs.existsSync(file)) {
  console.error('coverage-summary.json not found. Did you run coverage?');
  process.exit(1);
}
const summary = JSON.parse(fs.readFileSync(file, 'utf8'));
// Totals live under 'total'
const total = summary.total;
const thresholds = {
  statements: 80,
  branches: 55,
  functions: 85,
  lines: 80,
};

let ok = true;
for (const [k, min] of Object.entries(thresholds)) {
  const pct = total[k]?.pct ?? 0;
  if (pct < min) {
    ok = false;
    console.error(`Coverage threshold failed for ${k}: ${pct}% < ${min}%`);
  } else {
    console.log(`Coverage ${k}: ${pct}% (>= ${min}%)`);
  }
}

if (!ok) process.exit(2);
console.log('Coverage thresholds met.');

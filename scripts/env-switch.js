#!/usr/bin/env node
/*
 Switch NEXT_PUBLIC_PACKAGE_ID/NEXT_PUBLIC_MARKET_ID between OLD/NEW pairs.
 Usage:
   node scripts/env-switch.js old
   node scripts/env-switch.js new
*/
const fs = require('fs');
const path = require('path');

const mode = (process.argv[2] || '').toLowerCase();
if (!['old', 'new'].includes(mode)) {
  console.error('Usage: node scripts/env-switch.js <old|new>');
  process.exit(1);
}

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, '.env.local');

if (!fs.existsSync(ENV_PATH)) {
  console.error('.env.local not found at project root');
  process.exit(1);
}

const content = fs.readFileSync(ENV_PATH, 'utf8');
const lines = content.split(/\r?\n/);

const keyPkg = `NEXT_PUBLIC_PACKAGE_ID_${mode.toUpperCase()}`;
const keyMkt = `NEXT_PUBLIC_MARKET_ID_${mode.toUpperCase()}`;

const getVal = (k) => {
  const line = lines.find((l) => l.startsWith(k + '='));
  return line ? line.split('=')[1].trim() : '';
};

const pkgVal = getVal(keyPkg);
const mktVal = getVal(keyMkt);

if (!pkgVal || !mktVal) {
  console.error(`[env-switch] Missing ${keyPkg} or ${keyMkt} in .env.local`);
  process.exit(1);
}

// Remove existing base keys and append new values at end
const out = lines.filter((l) => !l.startsWith('NEXT_PUBLIC_PACKAGE_ID=') && !l.startsWith('NEXT_PUBLIC_MARKET_ID='));
out.push(`NEXT_PUBLIC_PACKAGE_ID=${pkgVal}`);
out.push(`NEXT_PUBLIC_MARKET_ID=${mktVal}`);

fs.writeFileSync(ENV_PATH, out.join('\n') + '\n');
console.log(`[env-switch] Set base IDs from ${mode.toUpperCase()}:\n  NEXT_PUBLIC_PACKAGE_ID=${pkgVal}\n  NEXT_PUBLIC_MARKET_ID=${mktVal}`);

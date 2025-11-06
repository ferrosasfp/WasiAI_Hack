#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT_PATH = path.join(ROOT, 'contracts/evm/deploy.out.json');
const ENV_PATH = path.join(ROOT, '.env.local');

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

function updateEnv(envPath, updates) {
  let content = '';
  try { content = fs.readFileSync(envPath, 'utf8'); } catch { content = ''; }
  const lines = content.split(/\r?\n/);
  const keys = Object.keys(updates).filter((k) => updates[k]);
  const filtered = lines.filter((l) => !keys.some((k) => l.startsWith(`${k}=`)));
  for (const k of keys) filtered.push(`${k}=${updates[k]}`);
  const out = filtered.filter((l, i, a) => i === 0 || l !== '' || a[i - 1] !== '').join('\n');
  fs.writeFileSync(envPath, out + '\n');
}

(function main() {
  const doc = readJson(OUT_PATH);
  if (!doc) {
    console.error(`[evm-env-sync] No JSON en ${OUT_PATH}. Ejecuta el deploy primero.`);
    process.exit(1);
  }
  const up = {
    NEXT_PUBLIC_EVM_NETWORK: doc.network,
    NEXT_PUBLIC_EVM_CHAIN_ID: String(doc.chainId || ''),
    NEXT_PUBLIC_EVM_MARKET: doc.marketplace,
    NEXT_PUBLIC_EVM_LICENSE: doc.licenseNFT,
  };
  updateEnv(ENV_PATH, up);
  console.log('[evm-env-sync] Actualizado .env.local con:', up);
})();

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, '.env.local');
const NETWORK = (process.argv[2] || '').toLowerCase();
if (!['base', 'avax'].includes(NETWORK)) {
  console.error('Uso: node scripts/evm-env-switch.js <base|avax>');
  process.exit(1);
}

const DEPLOY_PATH = path.join(ROOT, `contracts/evm/deploy.${NETWORK}.json`);
if (!fs.existsSync(DEPLOY_PATH)) {
  console.error(`[evm-env-switch] No existe ${DEPLOY_PATH}. Despliega primero en ${NETWORK}.`);
  process.exit(1);
}

function updateEnv(updates) {
  let content = '';
  try { content = fs.readFileSync(ENV_PATH, 'utf8'); } catch { content = ''; }
  const lines = content.split(/\r?\n/);
  const keys = Object.keys(updates).filter((k) => updates[k] !== undefined && updates[k] !== null);
  const filtered = lines.filter((l) => !keys.some((k) => l.startsWith(`${k}=`)));
  for (const k of keys) filtered.push(`${k}=${updates[k]}`);
  const out = filtered.filter((l, i, a) => i === 0 || l !== '' || a[i - 1] !== '').join('\n');
  fs.writeFileSync(ENV_PATH, out + '\n');
}

const doc = JSON.parse(fs.readFileSync(DEPLOY_PATH, 'utf8'));
const updates = {
  NEXT_PUBLIC_EVM_NETWORK: doc.network,
  NEXT_PUBLIC_EVM_CHAIN_ID: String(doc.chainId || ''),
  NEXT_PUBLIC_EVM_MARKET: doc.marketplace,
  NEXT_PUBLIC_EVM_LICENSE: doc.licenseNFT,
};
updateEnv(updates);
console.log(`[evm-env-switch] Ahora apuntando a ${NETWORK}:`, updates);

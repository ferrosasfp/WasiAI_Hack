#!/usr/bin/env node
/*
  Sync .env.local from Sui publish output
  - Reads contracts/sui/publish.out.json
  - Extracts NEXT_PUBLIC_PACKAGE_ID and (if available) NEXT_PUBLIC_MARKET_ID
  - Updates or appends keys in .env.local
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PUBLISH_PATH = path.join(ROOT, 'contracts', 'sui', 'publish.out.json');
const ENV_PATH = path.join(ROOT, '.env.local');

function readJsonSafe(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error(`[sync-env] No se pudo leer JSON en ${p}: ${e.message}`);
    process.exit(1);
  }
}

function extractIds(doc) {
  let packageId = undefined;
  let marketId = undefined;

  // Prefer objectChanges if present
  const oc = Array.isArray(doc.objectChanges) ? doc.objectChanges : [];
  for (const ch of oc) {
    if (!packageId && ch.type === 'published' && ch.packageId) {
      packageId = ch.packageId;
    }
    // Buscar creación del objeto Marketplace si se incluyó en la misma tx
    if (
      !marketId &&
      ch.type === 'created' &&
      ch.objectType &&
      typeof ch.objectType === 'string' &&
      ch.objectType.includes('::marketplace::Marketplace') &&
      ch.objectId
    ) {
      marketId = ch.objectId;
    }
  }

  // Fallbacks (effects.created)
  if (!packageId && doc.effects && Array.isArray(doc.effects.created)) {
    for (const c of doc.effects.created) {
      if (c.owner === 'Immutable' && c.reference && c.reference.objectId) {
        // Heuristic: first immutable created after publish is often the package. Not guaranteed.
        packageId = packageId || c.reference.objectId;
      }
    }
  }

  // Eventos (por si el create() emite MarketObjects en la misma tx)
  if (!marketId && Array.isArray(doc.events)) {
    for (const ev of doc.events) {
      // Look for a struct ending with ::MarketObjects and extract market_id if available
      const type = ev.type || ev.moveEvent?.type;
      const fields = ev.fields || ev.moveEvent?.fields;
      if (type && typeof type === 'string' && type.endsWith('::MarketObjects') && fields && fields.market_id) {
        // market_id puede venir como objeto con {id: string} o string directa
        marketId = typeof fields.market_id === 'string' ? fields.market_id : (fields.market_id.id || fields.market_id);
      }
    }
  }

  return { packageId, marketId };
}

function updateEnvFile(envPath, updates) {
  let content = '';
  try {
    content = fs.readFileSync(envPath, 'utf8');
  } catch {
    // Crear nuevo si no existe
    content = '';
  }

  const lines = content.split(/\r?\n/);
  const keys = Object.keys(updates).filter((k) => updates[k]);

  // 1) Eliminar TODAS las ocurrencias existentes de estas claves
  const filtered = lines.filter((l) => !keys.some((k) => l.startsWith(`${k}=`)));

  // 2) Agregar una sola línea por clave con el valor actual
  for (const k of keys) {
    filtered.push(`${k}=${updates[k]}`);
  }

  // 3) Compactar líneas vacías adyacentes y terminar con newline
  const out = filtered.filter((l, i, a) => i === 0 || l !== '' || a[i - 1] !== '').join('\n');
  fs.writeFileSync(envPath, out + '\n');
}

(function main() {
  if (!fs.existsSync(PUBLISH_PATH)) {
    console.error(`[sync-env] No se encontró ${PUBLISH_PATH}. Publica primero o verifica la ruta.`);
    process.exit(1);
  }

  const doc = readJsonSafe(PUBLISH_PATH);
  const { packageId, marketId } = extractIds(doc);

  if (!packageId) {
    console.error('[sync-env] No se encontró packageId en publish.out.json.');
  }
  if (!marketId) {
    console.warn('[sync-env] No se encontró MARKET_ID en publish.out.json (es normal si create() no se ejecutó en la misma tx).');
  }

  const updates = {
    NEXT_PUBLIC_PACKAGE_ID: packageId,
    NEXT_PUBLIC_MARKET_ID: marketId,
  };

  updateEnvFile(ENV_PATH, updates);

  console.log('[sync-env] Actualizado .env.local con:');
  for (const [k, v] of Object.entries(updates)) {
    if (v) console.log(`  - ${k}=${v}`);
  }
})();

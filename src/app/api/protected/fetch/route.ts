export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { webcrypto as nodeCrypto } from 'crypto';
import { getMeters, incCounter, observeHisto } from '@/lib/metrics';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';

// Reuse in-memory key store created by /api/keys/put
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const __KS: { byId: Map<string, { keyB64: string; createdAt: number }>; bySlug: Map<string, { keyB64: string; createdAt: number }> } = (globalThis as any).__KEY_STORE__ || { byId: new Map(), bySlug: new Map() };

const SUI_RPC_URL = process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';
const PKG = process.env.NEXT_PUBLIC_PACKAGE_ID || '';
const MARKET_PARENT = process.env.SUI_MARKET_PARENT || process.env.NEXT_PUBLIC_MARKET_ID || '';
const FAMILY_KEY = `${PKG}::marketplace::FamilyKey`;
const LICENSE_STRUCT = `${PKG}::marketplace::License`;

async function rpc(method: string, params: any[]): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const res = await fetch(SUI_RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (json.error) throw new Error(`rpc ${method} error: ${JSON.stringify(json.error)}`);
  return json.result ?? json;
}

async function resolveSlugByModelId(id: number): Promise<string | null> {
  try {
    const keyType = `${PKG}::marketplace::ModelKey`;
    const obj = await rpc('suix_getDynamicFieldObject', [MARKET_PARENT, { type: keyType, value: { id: String(id) } }]);
    const ffAny: any = obj?.data?.content?.fields; // eslint-disable-line @typescript-eslint/no-explicit-any
    const ff: any = ffAny?.value?.fields ?? ffAny; // eslint-disable-line @typescript-eslint/no-explicit-any
    const s = String(ff?.slug || '').trim();
    return s || null;
  } catch {
    return null;
  }
}

// =============================
// In-memory TTL cache of decrypted bytes
// =============================
type ByteCacheEntry = { buf: Uint8Array; mime: string; etag?: string; ts: number };
const __PROTECTED_BYTE_CACHE__: Map<string, ByteCacheEntry> = (globalThis as any).__PROTECTED_BYTE_CACHE__ || new Map<string, ByteCacheEntry>();
(globalThis as any).__PROTECTED_BYTE_CACHE__ = __PROTECTED_BYTE_CACHE__;

function getCached(key: string): ByteCacheEntry | null {
  const ce = __PROTECTED_BYTE_CACHE__.get(key);
  if (!ce) return null;
  if (BYTE_CACHE_TTL <= 0) return null;
  if (Date.now() - ce.ts > BYTE_CACHE_TTL) {
    __PROTECTED_BYTE_CACHE__.delete(key);
    return null;
  }
  return ce;
}

function setCached(key: string, entry: ByteCacheEntry) {
  if (BYTE_CACHE_TTL <= 0) return;
  __PROTECTED_BYTE_CACHE__.set(key, entry);
}

async function resolveModelIdBySlug(owner: string, slug: string): Promise<number | null> {
  try {
    const list = await rpc('suix_getDynamicFields', [MARKET_PARENT, null, 200]);
    const rows: any[] = list?.data || list?.result?.data || []; // eslint-disable-line @typescript-eslint/no-explicit-any
    const sWanted = String(slug ?? '').trim();
    const match = rows.find((r: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const t = r?.name?.type;
      const v = r?.name?.value;
      const o = v?.owner || v?.fields?.owner;
      const s = (v?.slug || v?.fields?.slug || '').trim();
      return typeof t === 'string' && t.endsWith('::marketplace::FamilyKey') &&
             typeof o === 'string' && typeof s === 'string' &&
             o.toLowerCase() === owner.toLowerCase() && s === sWanted;
    });
    if (!match?.objectId) return null;
    const obj = await rpc('sui_getObject', [match.objectId, { showContent: true }]);
    const idA = obj?.data?.content?.fields?.latest_id;
    const idB = obj?.result?.data?.content?.fields?.latest_id;
    const id = idA ?? idB;
    if (typeof id === 'string' || typeof id === 'number') return Number(id);
    return null;
  } catch (e) {
    console.error('[protected/fetch] resolveModelIdBySlug error', e);
    return null;
  }
}

async function isRevoked(licenseFieldObjectId: string | number): Promise<boolean> {
  try {
    const name = {
      type: `${PKG}::marketplace::LicenseFlagKey`,
      value: String(licenseFieldObjectId),
    };
    const res = await rpc('suix_getDynamicFieldObject', [{ parentId: MARKET_PARENT, name }]);
    return Boolean(res?.data?.content?.fields?.value?.fields?.revoked);
  } catch {
    return false;
  }
}

async function hasLicense(addr: string, modelId: number): Promise<boolean> {
  try {
    const filter = { StructType: LICENSE_STRUCT } as const;
    const options = { showType: true, showContent: true, showOwner: true } as const;
    const result = await rpc('suix_getOwnedObjects', [addr, { filter, options }]);
    const data: any[] = result?.data ?? []; // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const it of data) {
      const content = it?.data?.content || it?.content || it?.data?.content;
      const fields = content?.fields;
      const mid = fields?.model_id;
      if (mid == null) continue;
      if (Number(mid) !== Number(modelId)) continue;
      const lid = fields?.license_id ?? fields?.id;
      const revoked = await isRevoked(lid ?? 0);
      if (revoked) continue;
      return true;
    }
    return false;
  } catch (e) {
    console.error('[protected/fetch] hasLicense rpc error', e);
    return false;
  }
}

async function decryptAESGCM(cipher: Uint8Array, keyRaw: Uint8Array, iv: Uint8Array): Promise<Uint8Array> {
  const cryptoImpl: Crypto = (globalThis as any).crypto ?? (nodeCrypto as any);
  const subtle = (cryptoImpl as any).subtle as SubtleCrypto;
  const keyAb = keyRaw.buffer.slice(keyRaw.byteOffset, keyRaw.byteOffset + keyRaw.byteLength) as ArrayBuffer;
  const k = await subtle.importKey('raw', keyAb, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const cipherAb = cipher.buffer.slice(cipher.byteOffset, cipher.byteOffset + cipher.byteLength) as ArrayBuffer;
  const ivAb = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer;
  const plain = await subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(ivAb) }, k, cipherAb);
  return new Uint8Array(plain);
}

function detectMime(buf: Uint8Array): { mime: string } {
  const sig = (...xs: number[]) => xs.every((v, i) => buf[i] === v);
  const has = (s: string) => {
    const arr = Array.from(s).map((c) => c.charCodeAt(0));
    for (let i = 0; i + arr.length <= Math.min(buf.length, 16); i++) {
      if (arr.every((v, j) => buf[i + j] === v)) return true;
    }
    return false;
  };
  if (sig(0x89, 0x50, 0x4e, 0x47)) return { mime: 'image/png' };
  if (sig(0xff, 0xd8, 0xff)) return { mime: 'image/jpeg' };
  if (has('GIF8')) return { mime: 'image/gif' };
  if (sig(0x25, 0x50, 0x44, 0x46)) return { mime: 'application/pdf' };
  if (sig(0x50, 0x4b, 0x03, 0x04)) return { mime: 'application/zip' };
  if (has('ftyp')) return { mime: 'video/mp4' };
  return { mime: 'application/octet-stream' };
}

function getGateways(primary: string): string[] {
  const envCsv = (process.env.IPFS_GATEWAYS || '').trim();
  const fromEnv = envCsv
    ? envCsv.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const base = [] as string[];
  if (primary) base.push(primary);
  base.push(...fromEnv);
  // Último recurso: ipfs.io
  if (!base.length) base.push('https://ipfs.io');
  return Array.from(new Set(base));
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { cache: 'no-store', signal: ctrl.signal });
  } finally {
    clearTimeout(to);
  }
}

async function fetchEncryptedFromGateways(cid: string, gateways: string[]): Promise<{ res: Response | null; status: number; gateway?: string; ms?: number }> {
  let lastStatus = 0;
  for (const gw of gateways) {
    const attempts = Math.max(1, Number(process.env.IPFS_FETCH_RETRIES || 2));
    const timeoutMs = Math.max(1000, Number(process.env.IPFS_FETCH_TIMEOUT_MS || 5000));
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const url = `${gw}/ipfs/${cid}`;
        const t0 = Date.now();
        const r = await fetchWithTimeout(url, timeoutMs);
        const dt = Date.now() - t0;
        if (r.ok) return { res: r, status: r.status };
        lastStatus = r.status;
        console.error('[protected/fetch] gateway failed', gw, r.status, 'attempt', attempt + 1);
        const m = getMeters();
        if (m) {
          observeHisto('gateway_fetch_latency_ms' as any, dt, { gateway: gw });
          m.counters.gateway_failures_total.inc({ gateway: gw });
        }
      } catch (e) {
        console.error('[protected/fetch] gateway error', gw, e);
        const m = getMeters();
        if (m) m.counters.gateway_failures_total.inc({ gateway: gw });
      }
    }
  }
  return { res: null, status: lastStatus };
}

// =============================
// Cache config (env-driven)
// =============================
const CACHE_MAX_AGE = Math.max(0, Number(process.env.PROTECTED_CACHE_MAX_AGE || 0));
const CACHE_PRIVATE = String(process.env.PROTECTED_CACHE_PRIVATE || 'true').toLowerCase() !== 'false';
const CACHE_IMMUTABLE = String(process.env.PROTECTED_CACHE_IMMUTABLE || 'false').toLowerCase() === 'true';
const ENABLE_ETAG = String(process.env.PROTECTED_ENABLE_ETAG || 'false').toLowerCase() === 'true';
const ENABLE_RANGE = String(process.env.PROTECTED_ENABLE_RANGE || 'true').toLowerCase() !== 'false';
const BYTE_CACHE_TTL = Math.max(0, Number(process.env.PROTECTED_CACHE_TTL_MS || 120000));

function buildCacheControl(): string {
  const directives: string[] = [];
  directives.push(CACHE_PRIVATE ? 'private' : 'public');
  if (CACHE_MAX_AGE > 0) directives.push(`max-age=${CACHE_MAX_AGE}`); else directives.push('no-store');
  if (CACHE_IMMUTABLE) directives.push('immutable');
  return directives.join(', ');
}

async function sha256Hex(ab: ArrayBuffer): Promise<string> {
  const cryptoImpl: Crypto = (globalThis as any).crypto ?? (nodeCrypto as any);
  const subtle = (cryptoImpl as any).subtle as SubtleCrypto;
  const digest = await subtle.digest('SHA-256', ab);
  const b = new Uint8Array(digest);
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
}

export async function GET(req: NextRequest) {
  try {
    const tAll0 = Date.now();
    const url = new URL(req.url);
    const params = url.searchParams;
    const addr = String(params.get('addr') || '');
    const modelIdQ = params.get('modelId');
    const slugQ = params.get('slug');
    const ownerQ = params.get('owner');
    const uriQ = params.get('uri') || '';
    const gwOverride = params.get('gw') || '';

    if (!addr) return new Response(JSON.stringify({ error: 'missing addr' }), { status: 400, headers: { 'content-type': 'application/json' } });
    if (!uriQ) return new Response(JSON.stringify({ error: 'missing uri (ipfs://CID or CID)' }), { status: 400, headers: { 'content-type': 'application/json' } });

    let modelId = modelIdQ ? Number(modelIdQ) : NaN;
    if (!Number.isFinite(modelId) && slugQ) {
      if (!ownerQ) return new Response(JSON.stringify({ error: 'missing owner for slug' }), { status: 400, headers: { 'content-type': 'application/json' } });
      const resolved = await resolveModelIdBySlug(ownerQ, slugQ);
      if (resolved == null) return new Response(JSON.stringify({ error: 'modelId not found for slug (resolve failed or not exists)' }), { status: 404, headers: { 'content-type': 'application/json' } });
      modelId = resolved;
    }
    if (!Number.isFinite(modelId)) return new Response(JSON.stringify({ error: 'missing modelId/slug' }), { status: 400, headers: { 'content-type': 'application/json' } });

    const bypass = String(process.env.KEYS_BYPASS_ONCHAIN || '').toLowerCase() === 'true';
    const ok = bypass ? true : await hasLicense(addr, Number(modelId));
    if (!ok) return new Response(JSON.stringify({ error: 'no license' }), { status: 403, headers: { 'content-type': 'application/json' } });

    // Resolve key (prefer id, then slug) with short retries to handle eventual consistency
    const tryDelayMs = Math.max(200, Number(process.env.PROTECTED_KEY_LOOKUP_DELAY_MS || 800));
    const tryMax = Math.max(1, Number(process.env.PROTECTED_KEY_LOOKUP_RETRIES || 3));
    let keyB64 = '';
    for (let attempt = 0; attempt < tryMax && !keyB64; attempt++) {
      let entryById = __KS.byId.get(String(modelId));
      let entryBySlug = slugQ ? __KS.bySlug.get(String(slugQ).trim()) : undefined;
      keyB64 = entryById?.keyB64 || entryBySlug?.keyB64 || '';
      if (!keyB64 && process.env.DATABASE_URL) {
        const g: any = globalThis as any;
        const existing = g.__PRISMA__ as PrismaClient | undefined;
        const prisma: PrismaClient = existing ?? new PrismaClient();
        g.__PRISMA__ = prisma;
        try {
          const row = await prisma.modelKey.findUnique({ where: { modelId: Number(modelId) } });
          if (row?.keyB64) keyB64 = row.keyB64;
          if (!keyB64 && slugQ) {
            const row2 = await prisma.modelKey.findFirst({ where: { slug: String(slugQ).trim() } });
            if (row2?.keyB64) keyB64 = row2.keyB64;
          }
          if (keyB64) {
            __KS.byId.set(String(modelId), { keyB64, createdAt: Date.now() });
            if (slugQ) __KS.bySlug.set(String(slugQ).trim(), { keyB64, createdAt: Date.now() });
          }
        } catch {}
      }
      if (!keyB64) {
        const slugFromId = await resolveSlugByModelId(Number(modelId)).catch(() => null);
        if (slugFromId) {
          const mem = __KS.bySlug.get(slugFromId);
          if (mem?.keyB64) keyB64 = mem.keyB64;
          if (!keyB64 && process.env.DATABASE_URL) {
            try {
              const g: any = globalThis as any;
              const existing = g.__PRISMA__ as PrismaClient | undefined;
              const prisma: PrismaClient = existing ?? new PrismaClient();
              g.__PRISMA__ = prisma;
              const row2 = await prisma.modelKey.findFirst({ where: { slug: slugFromId } });
              if (row2?.keyB64) keyB64 = row2.keyB64;
            } catch {}
          }
          if (keyB64) {
            __KS.byId.set(String(modelId), { keyB64, createdAt: Date.now() });
            __KS.bySlug.set(slugFromId, { keyB64, createdAt: Date.now() });
          }
        }
      }
      if (!keyB64 && attempt + 1 < tryMax) await new Promise((r) => setTimeout(r, tryDelayMs));
    }
    if (!keyB64) return new Response(JSON.stringify({ error: 'key not found' }), { status: 404, headers: { 'content-type': 'application/json' } });

    const keyRaw = Uint8Array.from(Buffer.from(keyB64, 'base64'));

    // Cache key by modelId + CID
    const cid = uriQ.startsWith('ipfs://') ? uriQ.slice('ipfs://'.length) : uriQ;
    const cacheKey = `id:${modelId}:cid:${cid}`;

    // Try byte cache first
    const cached = getCached(cacheKey);
    if (cached) {
      const headers: Record<string, string> = {
        'content-type': cached.mime,
        'cache-control': buildCacheControl(),
        'accept-ranges': ENABLE_RANGE ? 'bytes' : 'none',
        'vary': ENABLE_RANGE ? 'Range' : '',
        'content-length': String(cached.buf.byteLength),
      };
      if (ENABLE_ETAG && cached.etag) {
        headers['etag'] = cached.etag;
        const inm = req.headers.get('if-none-match');
        if (inm && inm === cached.etag) return new Response(null, { status: 304, headers });
      }
      if (ENABLE_RANGE) {
        const range = req.headers.get('range');
        const total = cached.buf.byteLength;
        if (range && range.startsWith('bytes=')) {
          const m = range.match(/^bytes=(\d*)-(\d*)$/);
          if (m) {
            let start = m[1] ? Number(m[1]) : 0;
            let end = m[2] ? Number(m[2]) : total - 1;
            if (!Number.isFinite(start) || start < 0) start = 0;
            if (!Number.isFinite(end) || end >= total) end = total - 1;
            if (end >= start) {
              const part = cached.buf.slice(start, end + 1);
              headers['content-range'] = `bytes ${start}-${end}/${total}`;
              headers['content-length'] = String(part.byteLength);
              const partAb = part.buffer.slice(part.byteOffset, part.byteOffset + part.byteLength) as ArrayBuffer;
              return new Response(partAb, { status: 206, headers });
            }
          }
        }
      }
      const cachedAb = cached.buf.buffer.slice(cached.buf.byteOffset, cached.buf.byteOffset + cached.buf.byteLength) as ArrayBuffer;
      return new Response(cachedAb, { status: 200, headers });
    }

    // Fetch encrypted content from IPFS
    const primary = (gwOverride || process.env.NEXT_PUBLIC_PINATA_GATEWAY || '').trim();
    const candidates = getGateways(primary);
    const tGw0 = Date.now();
    const { res: encRes, status: lastStatus, gateway: usedGw } = await fetchEncryptedFromGateways(cid, candidates);
    if (!encRes) return new Response(JSON.stringify({ error: 'fetch-enc-failed', status: lastStatus }), { status: 502, headers: { 'content-type': 'application/json' } });
    const m1 = getMeters();
    if (m1) observeHisto('gateway_fetch_latency_ms' as any, Date.now() - tGw0, { gateway: usedGw || (candidates[0] || 'unknown') });
    const encBuf = new Uint8Array(await encRes.arrayBuffer());
    const iv = encBuf.slice(0, 12);
    const cipher = encBuf.slice(12);

    const tDec0 = Date.now();
    const plain = await decryptAESGCM(cipher, new Uint8Array(keyRaw), iv);
    const m2 = getMeters();
    if (m2) observeHisto('decrypt_latency_ms' as any, Date.now() - tDec0);
    const { mime } = detectMime(plain);

    // Build base headers
    const baseAb = plain.buffer.slice(plain.byteOffset, plain.byteOffset + plain.byteLength) as ArrayBuffer;
    const headers: Record<string, string> = {
      'content-type': mime,
      'cache-control': buildCacheControl(),
      'accept-ranges': ENABLE_RANGE ? 'bytes' : 'none',
      'vary': ENABLE_RANGE ? 'Range' : '',
    };

    // Optional ETag
    let etag: string | undefined;
    if (ENABLE_ETAG) {
      const hash = await sha256Hex(baseAb);
      etag = `W/"${hash}"`;
      headers['etag'] = etag;
      const inm = req.headers.get('if-none-match');
      if (inm && inm === etag) {
        setCached(cacheKey, { buf: new Uint8Array(baseAb), mime, etag, ts: Date.now() });
        return new Response(null, { status: 304, headers });
      }
    }

    // Range support
    if (ENABLE_RANGE) {
      const range = req.headers.get('range');
      const total = plain.byteLength;
      if (range && range.startsWith('bytes=')) {
        const m = range.match(/^bytes=(\d*)-(\d*)$/);
        if (m) {
          let start = m[1] ? Number(m[1]) : 0;
          let end = m[2] ? Number(m[2]) : total - 1;
          if (!Number.isFinite(start) || start < 0) start = 0;
          if (!Number.isFinite(end) || end >= total) end = total - 1;
          if (end >= start) {
            const part = plain.slice(start, end + 1);
            headers['content-range'] = `bytes ${start}-${end}/${total}`;
            headers['content-length'] = String(part.byteLength);
            return new Response(part.buffer.slice(part.byteOffset, part.byteOffset + part.byteLength), {
              status: 206,
              headers,
            });
          }
        }
      }
    }

    headers['content-length'] = String(plain.byteLength);
    // Cache the decrypted bytes
    setCached(cacheKey, { buf: new Uint8Array(baseAb), mime, etag, ts: Date.now() });
    const resp = new Response(baseAb, { status: 200, headers });
    const m3 = getMeters();
    if (m3) {
      observeHisto('protected_fetch_latency_ms' as any, Date.now() - tAll0);
      incCounter('protected_fetch_total' as any, { status: '200', error: '' });
    }
    return resp;
  } catch (e: any) {
    console.error('[protected/fetch] error', e);
    const m = getMeters();
    if (m) incCounter('protected_fetch_total' as any, { status: '500', error: String(e?.message || e) });
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

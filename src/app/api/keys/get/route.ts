export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { CACHE_TTLS } from '@/config';
import { PrismaClient } from '@prisma/client';
import { incCounter } from '@/lib/metrics';

export const runtime = 'nodejs';

type KeyEntry = { keyB64: string; createdAt: number };
type KeyStores = { byId: Map<string, KeyEntry>; bySlug: Map<string, KeyEntry> };
const __ANY = (globalThis as any).__KEY_STORE__;
let __KS: KeyStores;
if (__ANY instanceof Map) {
  __KS = { byId: __ANY as Map<string, KeyEntry>, bySlug: new Map() };
} else if (__ANY && typeof __ANY === 'object' && __ANY.byId && __ANY.bySlug) {
  __KS = __ANY as KeyStores;
} else {
  __KS = { byId: new Map(), bySlug: new Map() };
}
(globalThis as any).__KEY_STORE__ = __KS;
const __PRISMA__: PrismaClient | undefined = (globalThis as any).__PRISMA__ || (process.env.DATABASE_URL ? new PrismaClient() : undefined);
(globalThis as any).__PRISMA__ = __PRISMA__;

// Simple TTL cache for DB lookups (does not bypass license checks)
type CacheEntry = { keyB64: string; ts: number };
const __KEY_DB_CACHE__: Map<string, CacheEntry> = (globalThis as any).__KEY_DB_CACHE__ || new Map<string, CacheEntry>();
(globalThis as any).__KEY_DB_CACHE__ = __KEY_DB_CACHE__;
// Use centralized cache TTL configuration
const KEYS_CACHE_TTL = CACHE_TTLS.API_KEYS;

const PKG = process.env.NEXT_PUBLIC_PACKAGE_ID || '';
const MARKET_PARENT = process.env.SUI_MARKET_PARENT || process.env.NEXT_PUBLIC_MARKET_ID || '';
const LICENSE_STRUCT = `${PKG}::marketplace::License`;
const FAMILY_KEY = `${PKG}::marketplace::FamilyKey`;
const LICENSE_FLAG_KEY = `${PKG}::marketplace::LicenseFlagKey`;

const RPC_URL = process.env.SUI_RPC_URL || process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';

async function rpc(method: string, params: any[]): Promise<any> {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`rpc ${method} http ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`rpc ${method} error: ${JSON.stringify(json.error)}`);
  return json.result;
}

function u64ToLeHex(u: number | string): string {
  const v = BigInt(u);
  const buf = new Uint8Array(8);
  let x = v;
  for (let i = 0; i < 8; i++) {
    buf[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return '0x' + Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function isRevoked(licenseId: number | string): Promise<boolean> {
  try {
    const name = {
      type: LICENSE_FLAG_KEY,
      value: u64ToLeHex(licenseId),
    };
    const res = await rpc('suix_getDynamicFieldObject', [{ parentId: MARKET_PARENT, name }]);
    const revoked = Boolean(res?.data?.content?.fields?.value?.fields?.revoked);
    return revoked;
  } catch {
    return false; // si no existe DF, no revocada
  }
}

async function resolveModelIdBySlug(owner: string, slug: string): Promise<number | null> {
  try {
    // 1) Listar Dynamic Fields del parent y encontrar la entrada FamilyKey exacta
    const list = await rpc('suix_getDynamicFields', [MARKET_PARENT, null, 200]);
    const rows: any[] = list?.result?.data || list?.data || [];
    const sWanted = String(slug ?? '').trim();
    const match = rows.find((r: any) => {
      const t = r?.name?.type;
      const v = r?.name?.value;
      const o = v?.owner || v?.fields?.owner;
      const s = (v?.slug || v?.fields?.slug || '').trim();
      return typeof t === 'string' && t.endsWith('::marketplace::FamilyKey') &&
             typeof o === 'string' && typeof s === 'string' &&
             o.toLowerCase() === owner.toLowerCase() && s === sWanted;
    });
    if (!match) return null;
    const famMetaId = match?.objectId;
    if (!famMetaId) return null;

    // 2) Leer el objeto FamilyMeta para extraer latest_id
    const obj = await rpc('sui_getObject', [famMetaId, { showType: true, showOwner: true, showContent: true }]);
    const idA = obj?.result?.data?.content?.fields?.latest_id;
    const idB = obj?.data?.content?.fields?.value?.fields?.latest_id; // diferentes nodos pueden anidar distinto
    const id = idA ?? idB;
    if (typeof id === 'string' || typeof id === 'number') return Number(id);
    return null;
  } catch (e) {
    console.error('[keys/get] resolveModelIdBySlug error', e);
    return null;
  }
}

async function hasLicense(addr: string, modelId: number): Promise<boolean> {
  try {
    const filter = { StructType: LICENSE_STRUCT } as const;
    const options = { showType: true, showContent: true, showOwner: true } as const;
    const result = await rpc('suix_getOwnedObjects', [addr, { filter, options }]);
    const data: any[] = result?.data ?? [];
    for (const it of data) {
      const content = it?.data?.content || it?.content || it?.data?.content;
      const fields = content?.fields;
      const mid = fields?.model_id;
      if (mid == null) continue;
      if (Number(mid) !== Number(modelId)) continue;
      const lid = fields?.license_id ?? fields?.id;
      const revoked = await isRevoked(lid ?? 0);
      if (revoked) continue;
      // opcional: validar expires_at y rights aquí si lo deseas
      return true;
    }
    return false;
  } catch (e) {
    console.error('[keys/get] hasLicense rpc error', e);
    return false; // tratar como sin licencia para evitar 500
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const modelIdQ = searchParams.get('modelId');
    const slugQ = searchParams.get('slug');
    const ownerQ = searchParams.get('owner');
    const addr = String(searchParams.get('addr') || '');
    if (!modelIdQ && !slugQ) return new Response(JSON.stringify({ error: 'missing modelId or slug' }), { status: 400, headers: { 'content-type': 'application/json' } });
    let modelId = modelIdQ ? Number(modelIdQ) : NaN;
    if (!addr) return new Response(JSON.stringify({ error: 'missing addr' }), { status: 400, headers: { 'content-type': 'application/json' } });

    if (!Number.isFinite(modelId) && slugQ) {
      if (!ownerQ) return new Response(JSON.stringify({ error: 'missing owner for slug' }), { status: 400, headers: { 'content-type': 'application/json' } });
      const resolved = await resolveModelIdBySlug(ownerQ, slugQ);
      if (resolved == null) return new Response(JSON.stringify({ error: 'modelId not found for slug (resolve failed or not exists)' }), { status: 404, headers: { 'content-type': 'application/json' } });
      modelId = resolved;
    }

    const bypass = String(process.env.KEYS_BYPASS_ONCHAIN || '').toLowerCase() === 'true';
    const ok = bypass ? true : await hasLicense(addr, Number(modelId));
    if (!ok) {
      incCounter('keys_get_total' as any, { status: '403' } as any);
      return new Response(JSON.stringify({ error: 'no license' }), { status: 403, headers: { 'content-type': 'application/json' } });
    }

    let keyB64: string | undefined;

    // Try cache by modelId, then slug
    const cacheKeyId = Number.isFinite(modelId) ? `id:${modelId}` : '';
    const cacheKeySlug = slugQ ? `slug:${slugQ}` : '';
    const now = Date.now();
    if (cacheKeyId) {
      const ce = __KEY_DB_CACHE__.get(cacheKeyId);
      if (ce && (now - ce.ts) <= KEYS_CACHE_TTL) keyB64 = ce.keyB64;
    }
    if (!keyB64 && cacheKeySlug) {
      const ce = __KEY_DB_CACHE__.get(cacheKeySlug);
      if (ce && (now - ce.ts) <= KEYS_CACHE_TTL) keyB64 = ce.keyB64;
    }
    if (!keyB64 && __PRISMA__) {
      if (Number.isFinite(modelId) && modelId >= 0) {
        const row = await __PRISMA__.modelKey.findUnique({ where: { modelId: Number(modelId) } });
        keyB64 = row?.keyB64;
      }
      if (!keyB64 && slugQ) {
        const row = await __PRISMA__.modelKey.findFirst({ where: { slug: slugQ } });
        keyB64 = row?.keyB64;
      }
      if (keyB64) {
        if (cacheKeyId) __KEY_DB_CACHE__.set(cacheKeyId, { keyB64, ts: now });
        if (cacheKeySlug) __KEY_DB_CACHE__.set(cacheKeySlug, { keyB64, ts: now });
      }
    }
    if (!keyB64) {
      const rowMem = __KS.byId.get(String(modelId)) || (slugQ ? __KS.bySlug.get(slugQ) : undefined);
      keyB64 = rowMem?.keyB64;
    }
    if (!keyB64) {
      incCounter('keys_get_total' as any, { status: '404' } as any);
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
    }
    incCounter('keys_get_total' as any, { status: '200' } as any);
    return new Response(JSON.stringify({ keyB64 }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  } catch (e: any) {
    console.error('[keys/get] error', e);
    incCounter('keys_get_total' as any, { status: '500' } as any);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
}

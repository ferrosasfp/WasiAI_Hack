export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { CACHE_TTLS } from '@/config';
import { PrismaClient } from '@prisma/client';
import { incCounter } from '@/lib/metrics';

export const runtime = 'nodejs';

// EVM-only: License verification via indexed DB or on-chain call
// For now, we use bypass mode or DB lookup

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

// Simple TTL cache for DB lookups
type CacheEntry = { keyB64: string; ts: number };
const __KEY_DB_CACHE__: Map<string, CacheEntry> = (globalThis as any).__KEY_DB_CACHE__ || new Map<string, CacheEntry>();
(globalThis as any).__KEY_DB_CACHE__ = __KEY_DB_CACHE__;
const KEYS_CACHE_TTL = CACHE_TTLS.API_KEYS;

/**
 * EVM license check via indexed DB
 * Returns true if user has a valid license for the model
 */
async function hasLicenseEvm(addr: string, modelId: number): Promise<boolean> {
  if (!__PRISMA__) return false;
  try {
    // Check indexed licenses table for this address and model
    const license = await __PRISMA__.licenses.findFirst({
      where: {
        owner: addr.toLowerCase(),
        model_id: modelId,
        revoked: false,
        // For subscriptions, could add: expires_at > Date.now()
      },
    });
    return !!license;
  } catch (e) {
    console.error('[keys/get] hasLicenseEvm error', e);
    return false;
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

    // EVM: Resolve modelId from slug via indexed DB if needed
    // Note: models table doesn't have slug, so we check model_metadata or use modelId directly
    if (!Number.isFinite(modelId) && slugQ && __PRISMA__) {
      try {
        // Try to find by name match (slug is typically derived from name)
        const model = await __PRISMA__.models.findFirst({ 
          where: { name: { contains: slugQ, mode: 'insensitive' } } 
        });
        if (model) modelId = model.model_id;
      } catch {
        // ignore DB errors
      }
    }
    
    if (!Number.isFinite(modelId)) {
      return new Response(JSON.stringify({ error: 'modelId not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
    }

    // Check license: bypass mode or EVM DB check
    const bypass = String(process.env.KEYS_BYPASS_ONCHAIN || '').toLowerCase() === 'true';
    const ok = bypass ? true : await hasLicenseEvm(addr, Number(modelId));
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

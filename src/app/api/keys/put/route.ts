import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { incCounter } from '@/lib/metrics';

export const runtime = 'nodejs';

type KeyEntry = { keyB64: string; createdAt: number };
// In-memory store (demo): by modelId and by slug
type KeyStores = { byId: Map<string, KeyEntry>; bySlug: Map<string, KeyEntry> };
const __KS: KeyStores = (globalThis as any).__KEY_STORE__ || { byId: new Map(), bySlug: new Map() };
(globalThis as any).__KEY_STORE__ = __KS;
const __PRISMA__: PrismaClient | undefined = (globalThis as any).__PRISMA__ || (process.env.DATABASE_URL ? new PrismaClient() : undefined);
(globalThis as any).__PRISMA__ = __PRISMA__;

export async function POST(req: NextRequest) {
  try {
    const devBypass = String(process.env.ALLOW_CLIENT_KEYS_PUT || 'false').toLowerCase() === 'true';
    const requiredToken = process.env.KEYS_ADMIN_TOKEN || '';
    if (requiredToken && !devBypass) {
      const auth = req.headers.get('authorization') || '';
      const hdr = req.headers.get('x-admin-token') || '';
      const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';
      const provided = hdr || bearer;
      if (provided !== requiredToken) {
        incCounter('keys_put_total' as any, { status: '401' } as any);
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
      }
    }
    const body = await req.json();
    const modelIdRaw = body?.modelId;
    const slugRaw = body?.slug;
    const keyB64 = String(body?.keyB64 || '');
    if (!keyB64) return new Response(JSON.stringify({ error: 'missing keyB64' }), { status: 400, headers: { 'content-type': 'application/json' } });
    const entry: KeyEntry = { keyB64, createdAt: Date.now() };
    let wrote = false;
    if (typeof modelIdRaw !== 'undefined') {
      const modelId = Number(modelIdRaw);
      if (!Number.isNaN(modelId) && modelId >= 0) {
        __KS.byId.set(String(modelId), entry);
        wrote = true;
      }
    }
    if (typeof slugRaw === 'string' && slugRaw.trim().length > 0) {
      __KS.bySlug.set(slugRaw.trim(), entry);
      wrote = true;
    }
    if (!wrote) return new Response(JSON.stringify({ error: 'missing modelId or slug' }), { status: 400, headers: { 'content-type': 'application/json' } });

    if (__PRISMA__) {
      try {
        const modelId = typeof modelIdRaw !== 'undefined' && !Number.isNaN(Number(modelIdRaw)) ? Number(modelIdRaw) : null;
        const slug = typeof slugRaw === 'string' && slugRaw.trim().length > 0 ? slugRaw.trim() : null;
        if (modelId != null) {
          await __PRISMA__.modelKey.upsert({
            where: { modelId },
            update: { keyB64, slug: slug ?? undefined },
            create: { modelId, slug, keyB64 },
          });
        } else if (slug) {
          const existing = await __PRISMA__.modelKey.findFirst({ where: { slug } });
          if (existing) {
            await __PRISMA__.modelKey.update({ where: { modelId: existing.modelId }, data: { keyB64 } });
          } else {
            await __PRISMA__.modelKey.create({ data: { modelId: -1, slug, keyB64 } });
          }
        }
      } catch {
        // ignore DB errors in dev; in-memory store already updated
      }
    }
    incCounter('keys_put_total' as any, { status: '200' } as any);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  } catch (e: any) {
    incCounter('keys_put_total' as any, { status: '500' } as any);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
}

import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// In-memory reservations with TTL
// key: slug, value: expiresAt (ms)
const g: any = globalThis as any;
const RES_TTL_MS = 10 * 60 * 1000; // 10 minutes
const reservations: Map<string, number> = g.__SLUG_RES__ || new Map();
g.__SLUG_RES__ = reservations;

function kebabify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
function validSlug(s: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length >= 3 && s.length <= 40;
}
function sweep() {
  const now = Date.now();
  for (const [k, exp] of reservations.entries()) {
    if (exp <= now) reservations.delete(k);
  }
}

export async function POST(req: NextRequest) {
  try {
    sweep();
    const body = await req.json().catch(() => ({}));
    const raw = String(body?.slug || '').trim();
    const slug = validSlug(raw) ? raw : kebabify(raw);
    if (!validSlug(slug)) return new Response(JSON.stringify({ ok: false, error: 'invalid-slug' }), { status: 400, headers: { 'content-type': 'application/json' } });

    // If reserved locally and not expired, reject
    const now = Date.now();
    const exp = reservations.get(slug) || 0;
    if (exp > now) return new Response(JSON.stringify({ ok: true, reserved: false, reason: 'reserved' }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

    // Check on-chain presence best-effort via local endpoint
    try {
      const origin = new URL(req.url).origin;
      const r = await fetch(`${origin}/api/models/resolve-id?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json().catch(() => ({}));
        if (j?.found) return new Response(JSON.stringify({ ok: true, reserved: false, reason: 'exists' }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
      }
    } catch {}

    // Check DB presence if available
    try {
      const g: any = globalThis as any;
      const prisma = g.__PRISMA__ as any;
      if (prisma?.modelKey) {
        const row = await prisma.modelKey.findFirst({ where: { slug } });
        if (row) return new Response(JSON.stringify({ ok: true, reserved: false, reason: 'db-exists' }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
      }
    } catch {}

    // Reserve
    reservations.set(slug, now + RES_TTL_MS);
    return new Response(JSON.stringify({ ok: true, reserved: true, slug, ttlMs: RES_TTL_MS }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    sweep();
    const { searchParams } = new URL(req.url);
    const raw = String(searchParams.get('slug') || '').trim();
    const slug = validSlug(raw) ? raw : kebabify(raw);
    if (!validSlug(slug)) return new Response(JSON.stringify({ ok: false, error: 'invalid-slug' }), { status: 400, headers: { 'content-type': 'application/json' } });
    reservations.delete(slug);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

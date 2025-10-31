import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSuiClient } from '@/lib/sui';
import { PACKAGE_ID, MODULES, MARKET_ID } from '@/lib/sui/constants';

export const runtime = 'nodejs';

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function resolveIdFromTx(txDigest: string, tries = 10, delayMs = 1000): Promise<number | null> {
  const client = getSuiClient();
  for (let i = 0; i < tries; i++) {
    try {
      const effects: any = await (client as any).getTransactionBlock({ digest: txDigest, options: { showEvents: true } });
      const events: any[] = effects?.events || [];
      for (const e of events) {
        try {
          const type: string = e?.type || '';
          if (!type.includes(`${PACKAGE_ID}::${MODULES.MARKETPLACE}`)) continue;
          const data: any = e?.parsedJson || {};
          const idNum = Number(data?.id ?? data?.model_id);
          if (Number.isFinite(idNum)) return idNum;
        } catch {}
      }
    } catch {}
    await sleep(delayMs);
  }
  return null;
}

async function resolveIdFromSlug(slug: string, tries = 8, delayMs = 1000): Promise<number | null> {
  const client = getSuiClient();
  for (let i = 0; i < tries; i++) {
    try {
      let cursor: string | null = null;
      do {
        const page = await client.getDynamicFields({ parentId: MARKET_ID, limit: 50, cursor: cursor || undefined });
        for (const f of page.data) {
          try {
            const t: string | undefined = (f as any)?.name?.type;
            if (!t || !t.toLowerCase().endsWith('::modelkey')) continue;
            const obj = await client.getDynamicFieldObject({ parentId: MARKET_ID, name: (f as any).name });
            const ffAny: any = (obj as any)?.data?.content?.fields;
            const ff: any = ffAny?.value?.fields ?? ffAny;
            const s = String(ff?.slug || '').trim();
            if (s === slug) {
              const idNum = Number(ff?.id ?? ff?.model_id ?? (f as any)?.name?.value?.id);
              if (Number.isFinite(idNum)) return idNum;
            }
          } catch {}
        }
        cursor = page.hasNextPage ? page.nextCursor : null;
      } while (cursor);
    } catch {}
    await sleep(delayMs);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slugRaw: string = String(body?.slug || '');
    const keyB64: string = String(body?.keyB64 || '');
    const txDigest: string | null = body?.txDigest || null;
    const slug = slugRaw.trim();
    if (!slug || !keyB64) return new Response(JSON.stringify({ error: 'missing slug/keyB64' }), { status: 400, headers: { 'content-type': 'application/json' } });

    // 1) Resolve modelId (prefer from tx digest)
    let modelId: number | null = null;
    if (txDigest) modelId = await resolveIdFromTx(txDigest, 10, 1200);
    if (modelId == null) modelId = await resolveIdFromSlug(slug, 8, 1200);

    // 2) Save keys in memory
    const g: any = globalThis as any;
    const ks: { byId: Map<string, { keyB64: string; createdAt: number }>; bySlug: Map<string, { keyB64: string; createdAt: number }> } = g.__KEY_STORE__ || { byId: new Map(), bySlug: new Map() };
    g.__KEY_STORE__ = ks;
    const entry = { keyB64, createdAt: Date.now() };
    ks.bySlug.set(slug, entry);
    if (modelId != null) ks.byId.set(String(modelId), entry);

    // 3) Save to DB best-effort
    const prisma: PrismaClient | undefined = g.__PRISMA__ || (process.env.DATABASE_URL ? new PrismaClient() : undefined);
    g.__PRISMA__ = prisma;
    if (prisma) {
      try {
        if (modelId != null) {
          await prisma.modelKey.upsert({ where: { modelId }, update: { keyB64, slug }, create: { modelId, slug, keyB64 } });
        } else {
          const existing = await prisma.modelKey.findFirst({ where: { slug } });
          if (existing) await prisma.modelKey.update({ where: { modelId: existing.modelId }, data: { keyB64 } });
          else await prisma.modelKey.create({ data: { modelId: -1, slug, keyB64 } });
        }
      } catch {}
    }

    // 4) Release slug reservation (best-effort, no await)
    try {
      const origin = new URL(req.url).origin;
      // Fire-and-forget
      fetch(`${origin}/api/models/slug-available?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' }).catch(() => {});
    } catch {}

    return new Response(JSON.stringify({ ok: true, modelId }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

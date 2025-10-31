import { NextRequest } from 'next/server';
import { getSuiClient } from '@/lib/sui';
import { MARKET_ID, PACKAGE_ID, MODULES } from '@/lib/sui/constants';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slugRaw = searchParams.get('slug') || '';
    const slug = String(slugRaw).trim();
    if (!slug) return new Response(JSON.stringify({ error: 'missing slug' }), { status: 400, headers: { 'content-type': 'application/json' } });

    const client = getSuiClient();
    const keyType = `${PACKAGE_ID}::${MODULES.MARKETPLACE}::ModelKey`;

    // List dynamic fields of MARKET_ID, match by slug
    let cursor: string | null = null;
    const matches: any[] = [];
    try {
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
            if (s && s === slug) {
              const idNum = Number(ff?.id ?? ff?.model_id ?? (f as any)?.name?.value?.id);
              if (Number.isFinite(idNum)) matches.push({ id: idNum });
            }
          } catch {}
        }
        cursor = page.hasNextPage ? page.nextCursor : null;
      } while (cursor);
    } catch {}

    // Fallback: devInspect get_models_page and scan for slug in content when possible
    if (matches.length === 0) {
      try {
        const txMod = await import('@mysten/sui/transactions');
        const tx = new txMod.Transaction();
        tx.moveCall({ target: `${PACKAGE_ID}::${MODULES.MARKETPLACE}::get_models_page`, arguments: [tx.object(MARKET_ID), tx.pure.u64(0), tx.pure.u64(200)] });
        const client2 = getSuiClient();
        const DEFAULT_SENDER = '0x0000000000000000000000000000000000000000000000000000000000000001';
        const r: any = await (client2 as any).devInspectTransactionBlock({ transactionBlock: await tx.build({ client: client2 }), sender: DEFAULT_SENDER });
        const objList: any[] = (r?.results?.[0]?.events || []).map((e: any) => e?.parsedJson).filter(Boolean);
        // Best-effort: if we find slug/id in parsed events
        for (const o of objList) {
          try {
            const s = String((o.slug || o.Slug || '').toString()).trim();
            const idNum = Number(o.id ?? o.model_id);
            if (s === slug && Number.isFinite(idNum)) { matches.push({ id: idNum }); break; }
          } catch {}
        }
      } catch {}
    }

    if (matches.length === 0) return new Response(JSON.stringify({ found: false }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    // Prefer the highest id (latest)
    const id = matches.map((m) => m.id).sort((a, b) => b - a)[0];
    return new Response(JSON.stringify({ found: true, id }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

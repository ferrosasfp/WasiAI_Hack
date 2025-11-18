// src/app/api/model-info/route.ts
import { NextRequest } from 'next/server';
import { getSuiClient } from '@/lib/sui';
import { PACKAGE_ID, MODULES, FUNCTIONS, MARKET_ID } from '@/lib/sui/constants';
import { decodeModelInfoEx } from '@/lib/sui/parsers';

// no ISR; respond fresh for debugging/hydration
export const runtime = 'nodejs';

function extractReturnBytes(resp: any): Uint8Array | null {
  try {
    const rv = (resp as any)?.results?.[0]?.returnValues;
    const b64: string | undefined = Array.isArray(rv) && rv.length ? rv[0][0] : undefined;
    if (b64) {
      if (typeof Buffer !== 'undefined') return Uint8Array.from(Buffer.from(b64, 'base64'));
      if (typeof atob !== 'undefined') return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    }
  } catch {}
  try {
    const rv2 = (resp as any)?.effects?.returnValues;
    const b64: string | undefined = Array.isArray(rv2) && rv2.length ? rv2[0][0] : undefined;
    if (b64) {
      if (typeof Buffer !== 'undefined') return Uint8Array.from(Buffer.from(b64, 'base64'));
      if (typeof atob !== 'undefined') return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    }
  } catch {}
  return null;
}

async function getModelInfoServer(id: number) {
  const client = getSuiClient();

  // 1) DF directo por ModelKey
  const keyType = `${PACKAGE_ID}::${MODULES.MARKETPLACE}::ModelKey`;
  let ff: any = {};
  try {
    const df = await (client as any).getDynamicFieldObject({
      parentId: MARKET_ID,
      name: { type: keyType, value: { id: String(id) } },
    });
    const fieldsAny: any = df?.data?.content?.fields;
    ff = fieldsAny?.value?.fields ?? fieldsAny ?? {};
  } catch {}

  // 2) infoEx vía devInspect (sender configurable por env)
  let infoEx: any = null;
  try {
    const txMod = await import('@mysten/sui/transactions');
    const tx = new txMod.Transaction();
    tx.moveCall({ target: `${PACKAGE_ID}::${MODULES.MARKETPLACE}::${FUNCTIONS.GET_MODEL_INFO_EX}`, arguments: [tx.object(MARKET_ID), tx.pure.u64(id)] });
    const DEFAULT_SENDER = process.env.SUI_DEVINSPECT_SENDER || '0x0000000000000000000000000000000000000000000000000000000000000001';
    const r = await client.devInspectTransactionBlock({ transactionBlock: await tx.build({ client }), sender: DEFAULT_SENDER });
    const bytes = extractReturnBytes(r);
    infoEx = bytes ? decodeModelInfoEx(bytes) : null;
  } catch {}

  return { fields: ff, infoEx };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id') ?? '0');
    if (!Number.isFinite(id) || id < 0) return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

    const data = await getModelInfoServer(id);
    const ff: any = data?.fields || {};
    const ex: any = data?.infoEx || {};
    const model = {
      id,
      owner: ex.owner ?? ff.owner,
      creator: ex.creator ?? ff.creator,
      listed: typeof ex.listed === 'boolean' ? ex.listed : (typeof ff.listed === 'boolean' ? ff.listed : true),
      price_perpetual: ex.price_perpetual ?? ff.price_perpetual,
      price_subscription: ex.price_subscription ?? ff.price_subscription,
      default_duration_days: ex.default_duration_days ?? ff.default_duration_days,
      version: ex.version ?? ff.version,
      uri: ff.uri,
      name: ff.name,
      slug: ff.slug,
    };
    return new Response(JSON.stringify({ id, data: model }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
}

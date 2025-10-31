import { getSuiClient } from '@/lib/sui/client';
import { MARKET_ID } from '@/lib/sui/constants';
import { env } from '@/config/env';

export type MarketInfo = {
  feeBps: number;
  feeRecipient?: string | null;
  treasury?: string | null;
  raw?: any;
};

let cached: MarketInfo | null = null;
let pending: Promise<MarketInfo> | null = null;

export async function getMarketInfo(): Promise<MarketInfo> {
  if (cached) return cached;
  if (pending) return pending;
  pending = (async () => {
    const client = getSuiClient();
    let feeBps = Number(env.NEXT_PUBLIC_MARKET_FEE_BPS || 2000);
    let feeRecipient: string | null = null;
    let treasury: string | null = null;
    let raw: any = null;
    try {
      const obj = await client.getObject({ id: MARKET_ID, options: { showContent: true, showType: true } });
      raw = obj;
      const fields = (obj as any)?.data?.content?.fields || (obj as any)?.fields || null;
      if (fields) {
        const fb = Number(fields.fee_bps ?? fields.feeBps ?? fields.fee);
        if (!Number.isNaN(fb) && fb >= 0 && fb <= 10_000) feeBps = fb;
        feeRecipient = (fields.fee_recipient || fields.feeRecipient || null) as any;
        treasury = (fields.treasury || null) as any;
      }
    } catch {}
    const out: MarketInfo = { feeBps, feeRecipient, treasury, raw };
    cached = out;
    pending = null;
    return out;
  })();
  return pending;
}

export function getCachedMarketInfo(): MarketInfo | null {
  return cached;
}

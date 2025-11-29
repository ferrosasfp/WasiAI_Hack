// EVM-only marketplace store
// Market fee info is fetched from smart contract or env

import { env } from '@/config/env';

export type MarketInfo = {
  feeBps: number;
  feeRecipient?: string | null;
  treasury?: string | null;
};

let cached: MarketInfo | null = null;

/**
 * Get marketplace fee info.
 * For EVM, this comes from env config or smart contract.
 */
export async function getMarketInfo(): Promise<MarketInfo> {
  if (cached) return cached;
  
  // Default fee from env (2000 = 20%)
  const feeBps = Number(env.NEXT_PUBLIC_MARKET_FEE_BPS || 2000);
  
  cached = { feeBps };
  return cached;
}

export function getCachedMarketInfo(): MarketInfo | null {
  return cached;
}

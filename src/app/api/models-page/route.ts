// src/app/api/models-page/route.ts
import { NextRequest } from 'next/server';
import { getModelsService } from '@/domain/models';
import type { ChainKind } from '@/domain/models/types';
import { createPublicClient, http } from 'viem'
import { avalanche, avalancheFuji, base, baseSepolia } from 'viem/chains'

const MARKET_ABI_MIN = [
  { name: 'nextId', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'activeModels', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'models', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [
    { name: 'owner', type: 'address' },
    { name: 'creator', type: 'address' },
    { name: 'name', type: 'string' },
    { name: 'uri', type: 'string' },
    { name: 'royaltyBps', type: 'uint256' },
    { name: 'listed', type: 'bool' },
    { name: 'pricePerpetual', type: 'uint256' },
    { name: 'priceSubscription', type: 'uint256' },
    { name: 'defaultDurationDays', type: 'uint256' },
    { name: 'deliveryRightsDefault', type: 'uint8' },
    { name: 'deliveryModeHint', type: 'uint8' },
    { name: 'version', type: 'uint16' },
    { name: 'termsHash', type: 'bytes32' },
  ] },
] as const

function getChainById(chainId: number) {
  const list = [avalancheFuji, avalanche, baseSepolia, base]
  return list.find(c => c?.id === chainId)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = Number(searchParams.get('start') ?? '0');
    const limit = Number(searchParams.get('limit') ?? '50');
    const chain = (searchParams.get('chain') as ChainKind) || 'sui';
    const evmChainId = searchParams.get('chainId') ? Number(searchParams.get('chainId')) : undefined;
    const order = (searchParams.get('order') as any) || undefined;
    const listedOnly = searchParams.get('listed') === '1' || searchParams.get('listed') === 'true' || undefined;
    const q = searchParams.get('q') || undefined;

    // Elegir servicio por chain (evm placeholder: hoy fallback a Sui)
    const service = getModelsService(chain, evmChainId);
    const data = await service.getModelsPage({ start, limit, order, listedOnly, q });

    let marketAddress: string | undefined = undefined;
    if (chain === 'evm' && typeof evmChainId === 'number') {
      const key = `NEXT_PUBLIC_EVM_MARKET_${evmChainId}`;
      marketAddress = (process.env as any)[key];
    }

    let evmDebug: any = undefined;
    if (chain === 'evm' && typeof evmChainId === 'number' && marketAddress) {
      try {
        const chainObj = getChainById(evmChainId);
        if (chainObj) {
          const client = createPublicClient({ chain: chainObj, transport: http() })
          const nextId: bigint = await client.readContract({ address: marketAddress as `0x${string}`, abi: MARKET_ABI_MIN as any, functionName: 'nextId', args: [] }) as any
          const active: bigint = await client.readContract({ address: marketAddress as `0x${string}`, abi: MARKET_ABI_MIN as any, functionName: 'activeModels', args: [] }) as any
          const maxId = Number(nextId) - 1
          const samples: any[] = []
          let firstErr: string | undefined
          for (let i = Math.max(1, maxId - 2); i <= maxId; i++) {
            try {
              const m: any = await client.readContract({ address: marketAddress as `0x${string}`, abi: MARKET_ABI_MIN as any, functionName: 'models', args: [BigInt(i)] })
              samples.push({ id: i, listed: !!m?.listed, name: m?.name || '' })
            } catch (e: any) {
              if (!firstErr) firstErr = String(e?.message || e)
            }
          }
          evmDebug = { nextId: Number(nextId), activeModels: Number(active), maxId, lastIds: samples, firstErr }
        }
      } catch {}
    }

    const cacheCtl = 'public, max-age=30, s-maxage=60, stale-while-revalidate=300'
    return new Response(JSON.stringify({ chain, chainId: evmChainId, start, limit, order, listedOnly, q, marketAddress, evmDebug, data }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': cacheCtl,
        'cdn-cache-control': cacheCtl,
        'vary': 'accept-encoding'
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
}

// src/app/api/models-page/route.ts
import { NextRequest } from 'next/server';
import { getSuiModelsService } from '@/adapters/sui/models';
import type { ChainKind } from '@/domain/models/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = Number(searchParams.get('start') ?? '0');
    const limit = Number(searchParams.get('limit') ?? '50');
    const chain = (searchParams.get('chain') as ChainKind) || 'sui';
    const order = (searchParams.get('order') as any) || undefined;
    const listedOnly = searchParams.get('listed') === '1' || searchParams.get('listed') === 'true' || undefined;
    const q = searchParams.get('q') || undefined;

    // Por ahora solo Sui; EVM vendrá luego
    const service = getSuiModelsService();
    const data = await service.getModelsPage({ start, limit, order, listedOnly, q });

    return new Response(JSON.stringify({ chain, start, limit, order, listedOnly, q, data }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
}

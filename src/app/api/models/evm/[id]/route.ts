// src/app/api/models/evm/[id]/route.ts
import { NextRequest } from 'next/server'
import { getEvmModelsService } from '@/adapters/evm/models'

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const idNum = Number(ctx?.params?.id ?? '0')
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400, headers: { 'content-type': 'application/json' } })
    }
    const evmChainId = searchParams.get('chainId') ? Number(searchParams.get('chainId')) : undefined
    const service = getEvmModelsService(evmChainId)
    const data = await service.getModelInfo(idNum)

    let marketAddress: string | undefined
    if (typeof evmChainId === 'number') {
      marketAddress = (process.env as any)[`NEXT_PUBLIC_EVM_MARKET_${evmChainId}`]
    }

    return new Response(JSON.stringify({ chain: 'evm', chainId: evmChainId, marketAddress, id: idNum, data }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
  }
}

// src/app/api/models/evm/[id]/route.ts
import { NextRequest } from 'next/server'
import { getEvmModelsService } from '@/adapters/evm/models'
import { cacheClient, cacheHash } from '@/lib/cache'

const MODEL_CACHE_TTL_SEC = 600 // 10 min
const CACHE_CONTROL = 'private, max-age=60, stale-while-revalidate=300'

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const idNum = Number(ctx?.params?.id ?? '0')
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400, headers: { 'content-type': 'application/json' } })
    }
    const evmChainId = searchParams.get('chainId') ? Number(searchParams.get('chainId')) : undefined
    const cacheKey = `model:evm:v1:${evmChainId || 'default'}:${idNum}`
    const ifNoneMatch = req.headers.get('if-none-match') || ''
    const cached = await cacheClient.get<{ payload: any; etag: string }>(cacheKey)
    if (cached?.etag && cached.etag === ifNoneMatch) {
      return new Response(null, { status: 304, headers: { 'etag': cached.etag, 'cache-control': CACHE_CONTROL } })
    }
    if (cached?.payload) {
      return new Response(JSON.stringify(cached.payload), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'cache-control': CACHE_CONTROL,
          'etag': cached.etag || cacheHash(cached.payload),
        }
      })
    }
    const service = getEvmModelsService(evmChainId)
    const data = await service.getModelInfo(idNum)

    let marketAddress: string | undefined
    if (typeof evmChainId === 'number') {
      marketAddress = (process.env as any)[`NEXT_PUBLIC_EVM_MARKET_${evmChainId}`]
    }

    const payload = { chain: 'evm', chainId: evmChainId, marketAddress, id: idNum, data }
    const etag = cacheHash(payload)
    cacheClient.set(cacheKey, { payload, etag }, MODEL_CACHE_TTL_SEC).catch(() => {})

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': CACHE_CONTROL,
        'etag': etag,
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json', 'cache-control': CACHE_CONTROL } })
  }
}

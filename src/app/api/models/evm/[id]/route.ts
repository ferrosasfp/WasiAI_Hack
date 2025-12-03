// src/app/api/models/evm/[id]/route.ts
import { NextRequest } from 'next/server'
import { getEvmModelsService } from '@/adapters/evm/models'
import { cacheClient, cacheHash } from '@/lib/cache'
import { query } from '@/lib/db'

const MODEL_CACHE_TTL_SEC = 600 // 10 min
const CACHE_CONTROL = 'private, max-age=60, stale-while-revalidate=300'

/**
 * Try to get model from Neon database first (includes cached IPFS metadata)
 * Falls back to blockchain if not found in Neon
 */
async function getModelFromNeon(modelId: number, chainId: number): Promise<any | null> {
  try {
    const rows = await query(
      `SELECT 
        m.*,
        mm.metadata,
        mm.image_url,
        mm.categories,
        mm.tags,
        mm.industries,
        mm.use_cases,
        mm.frameworks,
        mm.architectures,
        mm.cached_at
      FROM models m
      LEFT JOIN model_metadata mm ON m.model_id = mm.model_id
      WHERE m.model_id = $1 AND m.chain_id = $2`,
      [modelId, chainId]
    )
    
    if (rows.length === 0) return null
    
    const row = rows[0]
    return {
      id: row.model_id,
      owner: row.owner,
      creator: row.creator,
      listed: row.listed,
      price_perpetual: row.price_perpetual,
      price_subscription: row.price_subscription,
      default_duration_days: row.default_duration_days,
      version: row.version,
      uri: row.uri,
      name: row.name,
      royalty_bps: row.royalty_bps,
      delivery_rights_default: row.delivery_rights_default,
      delivery_mode_hint: row.delivery_mode_hint,
      terms_hash: row.terms_hash,
      // Cached IPFS metadata
      metadata: row.metadata,
      imageUrl: row.image_url,
      categories: row.categories,
      tags: row.tags,
      industries: row.industries,
      useCases: row.use_cases,
      frameworks: row.frameworks,
      architectures: row.architectures,
      cached_at: row.cached_at,
    }
  } catch (error) {
    console.warn('[API models/evm/[id]] Neon query failed, falling back to blockchain:', error)
    return null
  }
}

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const idNum = Number(ctx?.params?.id ?? '0')
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400, headers: { 'content-type': 'application/json' } })
    }
    const evmChainId = searchParams.get('chainId') ? Number(searchParams.get('chainId')) : 43113 // Default to Fuji
    const cacheKey = `model:evm:v2:${evmChainId}:${idNum}`
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
    
    // Try Neon first (includes cached IPFS metadata)
    let data = await getModelFromNeon(idNum, evmChainId)
    
    // Fallback to blockchain if not in Neon
    if (!data) {
      console.log(`[API models/evm/[id]] Model ${idNum} not in Neon, fetching from blockchain`)
      const service = getEvmModelsService(evmChainId)
      data = await service.getModelInfo(idNum)
    }

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

// src/app/api/models/evm/[id]/reindex/route.ts
import { NextRequest } from 'next/server'
import { indexSingleModel } from '@/lib/indexer-single'

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const idNum = Number(ctx?.params?.id ?? '0')
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400, headers: { 'content-type': 'application/json' } })
    }
    
    const chainId = searchParams.get('chainId') ? Number(searchParams.get('chainId')) : 43113 // Default to Fuji
    
    console.log(`[API reindex] Reindexing model ${idNum} on chain ${chainId}`)
    
    const result = await indexSingleModel({ chainId, modelId: idNum })
    
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), { status: 500, headers: { 'content-type': 'application/json' } })
    }
    
    return new Response(JSON.stringify({ success: true, modelId: idNum, chainId }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })
  } catch (e: any) {
    console.error('[API reindex] Error:', e)
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
}

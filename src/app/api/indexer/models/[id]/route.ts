/**
 * API: Index a single model from blockchain to Neon
 * 
 * POST /api/indexer/models/[id]
 * 
 * Body:
 *   - chainId: number (required)
 * 
 * Response:
 *   { success: true, modelId: number, chainId: number }
 *   or
 *   { success: false, error: string }
 * 
 * Usage: Call after Quick Edit to sync blockchain → Neon immediately
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { indexSingleModel } from '@/lib/indexer-single'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const modelId = parseInt(params.id, 10)
    if (isNaN(modelId) || modelId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid model ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { chainId } = body

    if (!chainId || typeof chainId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'chainId is required' },
        { status: 400 }
      )
    }

    console.log(`[API Indexer] Indexing model ${modelId} on chain ${chainId}`)

    // Index the model
    const result = await indexSingleModel({ chainId, modelId })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Indexing failed' },
        { status: 500 }
      )
    }

    // Invalidate Next.js cache for all locales
    try {
      revalidatePath(`/en/evm/models/${modelId}`, 'page')
      revalidatePath(`/es/evm/models/${modelId}`, 'page')
      revalidatePath('/en/evm/models', 'page') // Also revalidate list
      revalidatePath('/es/evm/models', 'page')
      console.log(`[API Indexer] Cache invalidated for model ${modelId}`)
    } catch (revalidateErr) {
      console.warn('[API Indexer] Cache revalidation failed (non-critical):', revalidateErr)
    }

    return NextResponse.json({
      success: true,
      modelId: result.modelId,
      chainId: result.chainId,
      message: 'Model indexed successfully'
    })

  } catch (error: any) {
    console.error('[API Indexer] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

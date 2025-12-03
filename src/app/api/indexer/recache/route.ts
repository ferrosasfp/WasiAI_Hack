/**
 * Force re-cache of model metadata from IPFS
 * Usage: GET /api/indexer/recache?modelId=1 or GET /api/indexer/recache?all=true
 */

import { NextRequest, NextResponse } from 'next/server'
import { cacheModelMetadata } from '@/lib/indexer'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const modelIdParam = searchParams.get('modelId')
  const all = searchParams.get('all') === 'true'

  try {
    if (all) {
      // Re-cache all models
      const models = await query<{ model_id: number }>('SELECT model_id FROM models WHERE listed = true')
      const results = []
      
      for (const model of models) {
        try {
          await cacheModelMetadata(model.model_id)
          results.push({ modelId: model.model_id, success: true })
        } catch (err: any) {
          results.push({ modelId: model.model_id, success: false, error: err.message })
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Re-cached ${results.filter(r => r.success).length}/${models.length} models`,
        results
      })
    } else if (modelIdParam) {
      const modelId = parseInt(modelIdParam, 10)
      if (isNaN(modelId)) {
        return NextResponse.json({ error: 'Invalid modelId' }, { status: 400 })
      }
      
      await cacheModelMetadata(modelId)
      
      // Fetch updated data
      const updated = await query(
        `SELECT categories, tags, industries, use_cases, frameworks, architectures 
         FROM model_metadata WHERE model_id = $1`,
        [modelId]
      )
      
      return NextResponse.json({
        success: true,
        modelId,
        message: 'Metadata re-cached successfully',
        data: updated[0] || null
      })
    } else {
      return NextResponse.json({
        error: 'Missing parameter',
        usage: '/api/indexer/recache?modelId=1 or /api/indexer/recache?all=true'
      }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Re-cache error:', error)
    return NextResponse.json({
      error: 'Failed to re-cache',
      message: error.message
    }, { status: 500 })
  }
}

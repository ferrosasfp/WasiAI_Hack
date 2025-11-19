import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * GET /api/indexed/models/[id]
 * Returns a single model by ID with full metadata
 * 
 * Query params:
 *   - chainId (optional): Filter by chain ID
 * 
 * Response:
 *   {
 *     model: {
 *       model_id, chain_id, owner, creator, name, uri, 
 *       price_perpetual, price_subscription, default_duration_days,
 *       listed, version, royalty_bps, delivery_rights_default,
 *       delivery_mode_hint, terms_hash,
 *       metadata: { ... full IPFS metadata ... },
 *       image_url, categories, tags, industries, use_cases,
 *       frameworks, architectures
 *     }
 *   }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const modelId = parseInt(params.id, 10)
    if (isNaN(modelId)) {
      return NextResponse.json(
        { error: 'Invalid model ID' },
        { status: 400 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const chainId = searchParams.get('chainId')
      ? parseInt(searchParams.get('chainId')!, 10)
      : null

    // Build query with optional chainId filter
    let sql = `
      SELECT 
        m.*,
        mm.metadata,
        mm.image_url,
        mm.categories,
        mm.tags,
        mm.industries,
        mm.use_cases,
        mm.frameworks,
        mm.architectures
      FROM models m
      LEFT JOIN model_metadata mm ON m.model_id = mm.model_id
      WHERE m.model_id = $1
    `
    const params_array: any[] = [modelId]

    if (chainId !== null) {
      sql += ` AND m.chain_id = $2`
      params_array.push(chainId)
    }

    sql += ` LIMIT 1`

    const results = await query(sql, params_array)

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      )
    }

    const model = results[0]

    return NextResponse.json({ model })
  } catch (error: any) {
    console.error('Error fetching model from database:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch model',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

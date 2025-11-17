/**
 * GET /api/indexed/models
 * Returns paginated list of models from database
 * Query params:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20, max: 100)
 *   - chainId: Filter by chain (optional)
 *   - search: Search by name (optional)
 *   - category: Filter by category (optional)
 * 
 * Response: { models: [], total: number, page: number, pages: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import type { ModelRow, ModelMetadataRow } from '@/lib/db'

interface EnrichedModel extends ModelRow {
  metadata?: any
  image_url?: string | null
  categories?: string[] | null
  tags?: string[] | null
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const chainId = searchParams.get('chainId')
    const search = searchParams.get('search')
    const category = searchParams.get('category')

    const offset = (page - 1) * limit

    // Build WHERE clause
    const conditions: string[] = ['m.listed = true']
    const params: any[] = []
    let paramIndex = 1

    if (chainId) {
      conditions.push(`m.chain_id = $${paramIndex}`)
      params.push(parseInt(chainId))
      paramIndex++
    }

    if (search) {
      conditions.push(`m.name ILIKE $${paramIndex}`)
      params.push(`%${search}%`)
      paramIndex++
    }

    if (category) {
      conditions.push(`$${paramIndex} = ANY(mm.categories)`)
      params.push(category)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT m.model_id) as total
      FROM models m
      LEFT JOIN model_metadata mm ON m.model_id = mm.model_id
      ${whereClause}
    `
    const countResult = await query<{ total: string }>(countQuery, params)
    const total = parseInt(countResult[0]?.total || '0')

    // Get paginated results
    params.push(limit, offset)
    const dataQuery = `
      SELECT 
        m.*,
        mm.metadata,
        mm.image_url,
        mm.categories,
        mm.tags,
        mm.industries,
        mm.use_cases,
        mm.cached_at
      FROM models m
      LEFT JOIN model_metadata mm ON m.model_id = mm.model_id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    const models = await query<EnrichedModel>(dataQuery, params)

    const pages = Math.ceil(total / limit)

    return NextResponse.json({
      models,
      total,
      page,
      pages,
      limit,
    })
  } catch (error: any) {
    console.error('Error fetching models from database:', error)
    return NextResponse.json(
      { error: 'Failed to fetch models', details: error.message },
      { status: 500 }
    )
  }
}

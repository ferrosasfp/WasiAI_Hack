/**
 * GET /api/indexed/models
 * Returns paginated list of models from database (latest version only per slug)
 * Query params:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20, max: 100)
 *   - chainId: Filter by chain (optional)
 *   - search: Search by name (optional)
 *   - category: Filter by category (optional)
 * 
 * Response: { models: [], total: number, page: number, pages: number }
 * 
 * Note: Returns only the latest version (highest version number) of each model.
 * Models are grouped by slug (from metadata) to avoid showing duplicate listings.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import type { ModelRow, ModelMetadataRow } from '@/lib/db'

interface EnrichedModel extends ModelRow {
  metadata?: any
  image_url?: string | null
  categories?: string[] | null
  tags?: string[] | null
  industries?: string[] | null
  use_cases?: string[] | null
  frameworks?: string[] | null
  architectures?: string[] | null
  cached_at?: string | null
}

// Helper to parse PostgreSQL arrays (they come as strings like "{value1,value2}")
function parsePgArray(value: any): string[] {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'string') return []
  // PostgreSQL arrays come as "{value1,value2}" or {value1,value2}
  const cleaned = value.replace(/^\{|\}$/g, '').trim()
  if (!cleaned) return []
  // Split by comma and clean quotes
  return cleaned.split(',').map(v => v.replace(/^"|"$/g, '').trim()).filter(Boolean)
}

export async function GET(request: NextRequest) {
  try {
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      console.warn('[API /indexed/models] DATABASE_URL not configured - returning empty result')
      return NextResponse.json({
        models: [],
        total: 0,
        page: 1,
        pages: 0,
        limit: 20,
        warning: 'Database not configured',
      })
    }

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const chainId = searchParams.get('chainId')
    const search = searchParams.get('search')
    const category = searchParams.get('category')

    console.log('[API /indexed/models] Request params:', { page, limit, chainId, search, category })

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

    // Get total count of unique model "lines" (by slug)
    // Count distinct slugs, not distinct model_ids (which would count all versions)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM (
        SELECT DISTINCT ON (COALESCE((mm.metadata->>'slug')::text, m.model_id::text))
          m.model_id
        FROM models m
        LEFT JOIN model_metadata mm ON m.model_id = mm.model_id
        ${whereClause}
        ORDER BY COALESCE((mm.metadata->>'slug')::text, m.model_id::text), m.version DESC
      ) subq
    `
    
    console.log('[API /indexed/models] Count query:', countQuery)
    console.log('[API /indexed/models] Query params:', params)
    
    const countResult = await query<{ total: string }>(countQuery, params)
    const total = parseInt(countResult[0]?.total || '0')
    
    console.log('[API /indexed/models] Total count:', total)

    // Get paginated results - only latest version of each model (by slug)
    params.push(limit, offset)
    const dataQuery = `
      SELECT DISTINCT ON (COALESCE((mm.metadata->>'slug')::text, m.model_id::text))
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
      ${whereClause}
      ORDER BY 
        COALESCE((mm.metadata->>'slug')::text, m.model_id::text),
        m.version DESC,
        m.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    console.log('[API /indexed/models] Data query:', dataQuery)
    console.log('[API /indexed/models] All params:', params)

    const rawModels = await query<EnrichedModel>(dataQuery, params)
    
    console.log('[API /indexed/models] Models fetched:', rawModels.length)
    
    // Parse PostgreSQL arrays from string format to JavaScript arrays
    const models = rawModels.map(model => ({
      ...model,
      categories: parsePgArray(model.categories),
      tags: parsePgArray(model.tags),
      industries: parsePgArray(model.industries),
      use_cases: parsePgArray(model.use_cases),
      frameworks: parsePgArray(model.frameworks),
      architectures: parsePgArray(model.architectures),
    }))

    console.log('[API /indexed/models] Sample model data:', models[0] ? {
      model_id: models[0].model_id,
      name: models[0].name,
      uri: models[0].uri,
      has_metadata: !!models[0].metadata,
      has_image_url: !!models[0].image_url,
      categories: models[0].categories,
      tags: models[0].tags,
      frameworks: models[0].frameworks,
      architectures: models[0].architectures
    } : 'no models')

    const pages = Math.ceil(total / limit)

    return NextResponse.json({
      models,
      total,
      page,
      pages,
      limit,
    })
  } catch (error: any) {
    console.error('[API /indexed/models] ❌ ERROR:', error.message)
    console.error('[API /indexed/models] Error code:', error.code)
    console.error('[API /indexed/models] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      where: error.where,
      schema: error.schema,
      table: error.table,
      column: error.column,
    })
    console.error('[API /indexed/models] Stack trace:', error.stack)
    
    // Check if it's a database connection error
    if (error.message?.includes('connect') || error.message?.includes('ECONNREFUSED')) {
      console.warn('[API /indexed/models] Database connection failed - returning empty result')
      return NextResponse.json({
        models: [],
        total: 0,
        page: 1,
        pages: 0,
        limit: 20,
        error: 'Database unavailable',
      })
    }
    
    // Check if it's a missing table/column error
    if (error.code === '42P01' || error.code === '42703') {
      console.error('[API /indexed/models] Table or column does not exist!')
      console.error('[API /indexed/models] Schema:', error.schema)
      console.error('[API /indexed/models] Table:', error.table)
      console.error('[API /indexed/models] Column:', error.column)
      
      return NextResponse.json(
        { 
          models: [],
          total: 0,
          page: 1,
          pages: 0,
          error: 'Database schema error', 
          details: `${error.message} (code: ${error.code})`,
          hint: 'The database tables may not be created yet. Run migrations or indexer.'
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        models: [],
        total: 0,
        page: 1,
        pages: 0,
        error: 'Failed to fetch models', 
        details: error.message,
        code: error.code,
        hint: error.hint
      },
      { status: 500 }
    )
  }
}

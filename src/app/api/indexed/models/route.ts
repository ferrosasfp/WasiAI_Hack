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
 * 
 * POST /api/indexed/models
 * Register a new model in Neon DB after blockchain TX confirms
 * Body: { modelId, chainId, owner, creator, name, uri, pricePerpetual, priceSubscription, ... }
 */

import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
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
  // Inference fields from MarketplaceV2
  price_inference?: string | null
  inference_wallet?: string | null
  inference_endpoint?: string | null
  // Agent fields from AgentRegistryV2
  agent_id?: number | null
  agent_wallet?: string | null
  agent_endpoint?: string | null
  agent_active?: boolean | null
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

    // Get total count of unique model families (by owner + slug)
    // Count distinct families, not distinct model_ids (which would count all versions)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM (
        SELECT DISTINCT ON (COALESCE(m.slug, m.model_id::text), m.owner)
          m.model_id
        FROM models m
        LEFT JOIN model_metadata mm ON m.model_id = mm.model_id
        ${whereClause}
        ORDER BY COALESCE(m.slug, m.model_id::text), m.owner, m.version DESC
      ) subq
    `
    
    console.log('[API /indexed/models] Count query:', countQuery)
    console.log('[API /indexed/models] Query params:', params)
    
    const countResult = await query<{ total: string }>(countQuery, params)
    const total = parseInt(countResult[0]?.total || '0')
    
    console.log('[API /indexed/models] Total count:', total)

    // Get paginated results with agent data from AgentRegistryV2
    // Use DISTINCT ON to get only the latest version of each model family (by owner + slug)
    params.push(limit, offset)
    const dataQuery = `
      SELECT DISTINCT ON (COALESCE(m.slug, m.model_id::text), m.owner)
        m.*,
        mm.metadata,
        mm.image_url,
        mm.categories,
        mm.tags,
        mm.industries,
        mm.use_cases,
        mm.frameworks,
        mm.architectures,
        mm.cached_at,
        a.agent_id,
        a.wallet as agent_wallet,
        a.endpoint as agent_endpoint,
        a.active as agent_active
      FROM models m
      LEFT JOIN model_metadata mm ON m.model_id = mm.model_id
      LEFT JOIN agents a ON m.agent_id = a.agent_id
      ${whereClause}
      ORDER BY COALESCE(m.slug, m.model_id::text), m.owner, m.version DESC
    `
    
    // Wrap in subquery to apply pagination and final ordering
    const paginatedQuery = `
      SELECT * FROM (${dataQuery}) AS latest_models
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    console.log('[API /indexed/models] Paginated query:', paginatedQuery)
    console.log('[API /indexed/models] All params:', params)

    const rawModels = await query<EnrichedModel>(paginatedQuery, params)
    
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

/**
 * POST /api/indexed/models
 * Register a new model in Neon DB after blockchain TX confirms
 * This enables instant display without waiting for indexer
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      modelId, 
      chainId, 
      owner, 
      creator, 
      name, 
      uri, 
      pricePerpetual, 
      priceSubscription, 
      defaultDurationDays,
      royaltyBps,
      deliveryRightsDefault,
      deliveryModeHint,
      termsHash,
      txHash,
      // Inference fields
      priceInference,
      inferenceWallet,
      inferenceEndpoint,
      // Metadata fields for model_metadata table
      metadata,
      imageUrl,
      categories,
      tags,
      industries,
      useCases,
      frameworks,
      architectures
    } = body

    if (!modelId || !chainId || !owner) {
      return NextResponse.json(
        { error: 'Missing required fields: modelId, chainId, owner' },
        { status: 400 }
      )
    }

    console.log(`[Models] Registering model #${modelId} on chain ${chainId}`)

    // Check if model already exists
    const existing = await queryOne<ModelRow>(
      'SELECT model_id FROM models WHERE model_id = $1 AND chain_id = $2',
      [modelId, chainId]
    )

    if (existing) {
      console.log(`[Models] Model #${modelId} already exists, updating...`)
    }

    // Insert or update model (including inference fields)
    const modelQuery = `
      INSERT INTO models (
        model_id, chain_id, owner, creator, name, uri,
        price_perpetual, price_subscription, default_duration_days,
        royalty_bps, delivery_rights_default, delivery_mode_hint,
        terms_hash, listed, version,
        price_inference, inference_wallet, inference_endpoint,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12,
        $13, true, 1,
        $14, $15, $16,
        NOW(), NOW()
      )
      ON CONFLICT (model_id) DO UPDATE SET
        owner = EXCLUDED.owner,
        creator = EXCLUDED.creator,
        name = EXCLUDED.name,
        uri = EXCLUDED.uri,
        price_perpetual = EXCLUDED.price_perpetual,
        price_subscription = EXCLUDED.price_subscription,
        default_duration_days = EXCLUDED.default_duration_days,
        royalty_bps = EXCLUDED.royalty_bps,
        delivery_rights_default = EXCLUDED.delivery_rights_default,
        delivery_mode_hint = EXCLUDED.delivery_mode_hint,
        terms_hash = EXCLUDED.terms_hash,
        price_inference = EXCLUDED.price_inference,
        inference_wallet = EXCLUDED.inference_wallet,
        inference_endpoint = EXCLUDED.inference_endpoint,
        listed = true,
        updated_at = NOW()
      RETURNING model_id
    `

    // Calculate inference price in USDC base units (6 decimals)
    // priceInference comes as a string like "0.01" meaning $0.01 USDC
    const inferenceUsdcBaseUnits = priceInference 
      ? Math.floor(Number(priceInference) * 1e6).toString() 
      : '0'

    await query(modelQuery, [
      modelId,
      chainId,
      owner.toLowerCase(),
      (creator || owner).toLowerCase(),
      name || `Model #${modelId}`,
      uri || '',
      pricePerpetual ? BigInt(pricePerpetual).toString() : '0',
      priceSubscription ? BigInt(priceSubscription).toString() : '0',
      defaultDurationDays || 0,
      royaltyBps || 0,
      deliveryRightsDefault || 0,
      deliveryModeHint || 0,
      termsHash || null,
      inferenceUsdcBaseUnits,
      inferenceWallet || owner.toLowerCase(),
      inferenceEndpoint || null,
    ])

    // Insert or update metadata if provided
    if (metadata || imageUrl || categories || tags) {
      const metadataQuery = `
        INSERT INTO model_metadata (
          model_id, metadata, image_url, categories, tags,
          industries, use_cases, frameworks, architectures, cached_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, NOW()
        )
        ON CONFLICT (model_id) DO UPDATE SET
          metadata = COALESCE(EXCLUDED.metadata, model_metadata.metadata),
          image_url = COALESCE(EXCLUDED.image_url, model_metadata.image_url),
          categories = COALESCE(EXCLUDED.categories, model_metadata.categories),
          tags = COALESCE(EXCLUDED.tags, model_metadata.tags),
          industries = COALESCE(EXCLUDED.industries, model_metadata.industries),
          use_cases = COALESCE(EXCLUDED.use_cases, model_metadata.use_cases),
          frameworks = COALESCE(EXCLUDED.frameworks, model_metadata.frameworks),
          architectures = COALESCE(EXCLUDED.architectures, model_metadata.architectures),
          cached_at = NOW()
      `

      await query(metadataQuery, [
        modelId,
        metadata ? JSON.stringify(metadata) : null,
        imageUrl || null,
        categories || null,
        tags || null,
        industries || null,
        useCases || null,
        frameworks || null,
        architectures || null,
      ])
    }

    console.log(`[Models] ✅ Model #${modelId} registered successfully`)

    return NextResponse.json({
      success: true,
      message: existing ? 'Model updated successfully' : 'Model registered successfully',
      modelId,
      chainId,
    })
  } catch (error: any) {
    console.error('[Models] ❌ Error registering model:', error)
    return NextResponse.json(
      { error: 'Failed to register model', details: error.message },
      { status: 500 }
    )
  }
}

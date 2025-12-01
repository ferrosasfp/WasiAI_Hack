/**
 * GET /api/indexed/licenses
 * Returns user's licenses from database (FAST)
 * Query params:
 *   - userAddress: Wallet address (required)
 *   - chainId: Filter by chain (optional)
 *   - limit: Max items (default: 50)
 * 
 * Response: { licenses: [], total: number }
 * 
 * POST /api/indexed/licenses
 * Register a new license after purchase (called after blockchain TX confirms)
 * Body: { tokenId, modelId, owner, kind, expiresAt, chainId, txHash }
 */

import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import type { LicenseRow } from '@/lib/db'

interface EnrichedLicense extends LicenseRow {
  model_name?: string | null
  model_uri?: string | null
  model_image?: string | null
  model_metadata?: any
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userAddress = searchParams.get('userAddress')
    const chainId = searchParams.get('chainId')
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    if (!userAddress) {
      return NextResponse.json(
        { error: 'userAddress is required' },
        { status: 400 }
      )
    }

    // Build WHERE clause
    const conditions: string[] = ['LOWER(l.owner) = LOWER($1)']
    const params: any[] = [userAddress]
    let paramIndex = 2

    if (chainId) {
      conditions.push(`l.chain_id = $${paramIndex}`)
      params.push(parseInt(chainId))
      paramIndex++
    }

    const whereClause = conditions.join(' AND ')

    // Get user's licenses with model data (using the view)
    params.push(limit)
    const licensesQuery = `
      SELECT 
        l.*,
        m.name as model_name,
        m.uri as model_uri,
        mm.image_url as model_image,
        mm.metadata as model_metadata
      FROM licenses l
      JOIN models m ON l.model_id = m.model_id AND l.chain_id = m.chain_id
      LEFT JOIN model_metadata mm ON l.model_id = mm.model_id
      WHERE ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${paramIndex}
    `

    const licenses = await query<EnrichedLicense>(licensesQuery, params)

    return NextResponse.json({
      licenses,
      total: licenses.length,
    })
  } catch (error: any) {
    console.error('Error fetching licenses from database:', error)
    return NextResponse.json(
      { error: 'Failed to fetch licenses', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/indexed/licenses
 * Register a new license in Neon DB after blockchain purchase confirms
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tokenId, modelId, owner, kind, expiresAt, chainId, txHash, validApi, validDownload } = body

    if (!tokenId || !modelId || !owner || !chainId) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenId, modelId, owner, chainId' },
        { status: 400 }
      )
    }

    // Check if license already exists
    const existing = await queryOne<LicenseRow>(
      'SELECT token_id FROM licenses WHERE token_id = $1 AND chain_id = $2',
      [tokenId, chainId]
    )

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'License already registered',
        tokenId,
      })
    }

    // Insert new license
    const insertQuery = `
      INSERT INTO licenses (
        token_id, model_id, owner, kind, expires_at, chain_id, 
        revoked, valid_api, valid_download, tx_hash, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 
        false, $7, $8, $9, NOW()
      )
      ON CONFLICT (token_id, chain_id) DO UPDATE SET
        owner = EXCLUDED.owner,
        kind = EXCLUDED.kind,
        expires_at = EXCLUDED.expires_at,
        valid_api = EXCLUDED.valid_api,
        valid_download = EXCLUDED.valid_download,
        tx_hash = EXCLUDED.tx_hash
      RETURNING token_id
    `

    const expiresAtTimestamp = expiresAt ? new Date(expiresAt * 1000) : null

    await query(insertQuery, [
      tokenId,
      modelId,
      owner.toLowerCase(),
      kind ?? 0, // default to perpetual
      expiresAtTimestamp,
      chainId,
      validApi ?? true,
      validDownload ?? true,
      txHash || null,
    ])

    console.log(`[Licenses] Registered license #${tokenId} for model ${modelId} to ${owner}`)

    return NextResponse.json({
      success: true,
      message: 'License registered successfully',
      tokenId,
      modelId,
    })
  } catch (error: any) {
    console.error('Error registering license:', error)
    return NextResponse.json(
      { error: 'Failed to register license', details: error.message },
      { status: 500 }
    )
  }
}

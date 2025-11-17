/**
 * GET /api/indexed/licenses
 * Returns user's licenses from database (FAST)
 * Query params:
 *   - userAddress: Wallet address (required)
 *   - chainId: Filter by chain (optional)
 *   - limit: Max items (default: 50)
 * 
 * Response: { licenses: [], total: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
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

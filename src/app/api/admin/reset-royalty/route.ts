/**
 * Admin endpoint to reset all royalty_bps to 0 in Neon DB
 * POST /api/admin/reset-royalty
 * 
 * This is a one-time migration endpoint to disable royalties.
 * Can be deleted after use.
 */

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST() {
  try {
    // Check current state
    const before = await query<{model_id: number, name: string, royalty_bps: number}>(
      'SELECT model_id, name, royalty_bps FROM models WHERE royalty_bps > 0 ORDER BY model_id'
    )
    
    if (before.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No models with royalty > 0 found',
        updated: 0
      })
    }
    
    // Update all models to royalty_bps = 0
    const result = await query<{model_id: number, name: string}>(
      'UPDATE models SET royalty_bps = 0, updated_at = NOW() WHERE royalty_bps > 0 RETURNING model_id, name'
    )
    
    // Also update metadata JSON if it contains royaltyBps
    await query(`
      UPDATE model_metadata 
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{licensePolicy,royaltyBps}',
        '0'::jsonb
      )
      WHERE metadata->'licensePolicy'->>'royaltyBps' IS NOT NULL
        AND (metadata->'licensePolicy'->>'royaltyBps')::int > 0
    `)
    
    return NextResponse.json({
      success: true,
      message: `Reset royalty_bps to 0 for ${result.length} models`,
      updated: result.length,
      models: result.map(r => ({ model_id: r.model_id, name: r.name })),
      before: before
    })
    
  } catch (error) {
    console.error('[reset-royalty] Error:', error)
    return NextResponse.json(
      { error: 'Failed to reset royalty', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Just check current state
    const rows = await query<{model_id: number, name: string, royalty_bps: number}>(
      'SELECT model_id, name, royalty_bps FROM models ORDER BY model_id'
    )
    
    return NextResponse.json({
      models: rows,
      modelsWithRoyalty: rows.filter(r => r.royalty_bps > 0).length
    })
    
  } catch (error) {
    console.error('[reset-royalty] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check royalty', details: String(error) },
      { status: 500 }
    )
  }
}

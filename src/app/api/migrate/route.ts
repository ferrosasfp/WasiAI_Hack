/**
 * Migration API endpoint
 * Run database migrations via HTTP
 * Usage: GET /api/migrate?migration=003_agents_table
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// Only allow in development
const ALLOWED_MIGRATIONS = ['003_agents_table']

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const migration = searchParams.get('migration')

  if (!migration || !ALLOWED_MIGRATIONS.includes(migration)) {
    return NextResponse.json({ 
      error: 'Invalid migration',
      allowed: ALLOWED_MIGRATIONS 
    }, { status: 400 })
  }

  try {
    console.log(`🔄 Running migration: ${migration}`)

    if (migration === '003_agents_table') {
      // Create agents table
      await query(`
        CREATE TABLE IF NOT EXISTS agents (
          agent_id INTEGER PRIMARY KEY,
          chain_id INTEGER NOT NULL,
          model_id INTEGER NOT NULL,
          owner TEXT NOT NULL,
          wallet TEXT NOT NULL,
          endpoint TEXT,
          metadata_uri TEXT,
          registered_at BIGINT NOT NULL,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          indexed_at TIMESTAMP DEFAULT NOW()
        )
      `)
      console.log('✅ Created agents table')

      // Add agent_id to models table
      await query(`ALTER TABLE models ADD COLUMN IF NOT EXISTS agent_id INTEGER`)
      console.log('✅ Added agent_id to models')

      // Create indexes for agents
      await query(`CREATE INDEX IF NOT EXISTS idx_agents_model ON agents(model_id)`)
      await query(`CREATE INDEX IF NOT EXISTS idx_agents_owner ON agents(owner)`)
      await query(`CREATE INDEX IF NOT EXISTS idx_agents_active ON agents(active) WHERE active = true`)
      await query(`CREATE INDEX IF NOT EXISTS idx_agents_chain ON agents(chain_id, active)`)
      console.log('✅ Created indexes for agents')

      // Add columns to indexer_state
      await query(`ALTER TABLE indexer_state ADD COLUMN IF NOT EXISTS last_agent_id INTEGER DEFAULT 0`)
      await query(`ALTER TABLE indexer_state ADD COLUMN IF NOT EXISTS last_block_agents BIGINT DEFAULT 0`)
      console.log('✅ Updated indexer_state')

      // Create agent_metadata table
      await query(`
        CREATE TABLE IF NOT EXISTS agent_metadata (
          agent_id INTEGER PRIMARY KEY,
          metadata JSONB NOT NULL,
          name TEXT,
          description TEXT,
          image_url TEXT,
          capabilities TEXT[],
          cached_at TIMESTAMP DEFAULT NOW(),
          cache_ttl INTEGER DEFAULT 86400
        )
      `)
      console.log('✅ Created agent_metadata table')

      // Create GIN index for agent metadata
      await query(`CREATE INDEX IF NOT EXISTS idx_agent_metadata_json ON agent_metadata USING GIN(metadata)`)
      console.log('✅ Created GIN index for agent_metadata')

      return NextResponse.json({
        success: true,
        migration,
        message: 'Migration completed successfully',
        tables: ['agents', 'agent_metadata'],
        columns: ['models.agent_id', 'indexer_state.last_agent_id', 'indexer_state.last_block_agents']
      })
    }

    return NextResponse.json({ error: 'Migration not implemented' }, { status: 500 })
  } catch (error: any) {
    console.error('❌ Migration failed:', error)
    return NextResponse.json({
      error: 'Migration failed',
      message: error.message,
      code: error.code
    }, { status: 500 })
  }
}

/**
 * Database connection helper for Neon Postgres
 * Compatible with FREE tier, scalable to paid tiers
 */

import { Pool, PoolClient } from 'pg'

// Re-export PoolClient for use in other modules
export type { PoolClient }

// Singleton pool instance
let pool: Pool | null = null

/**
 * Get or create database connection pool
 * Uses environment variable: DATABASE_URL
 */
export function getPool(): Pool {
  // FORCE RECREATE POOL (dev mode fix)
  if (pool && process.env.NODE_ENV === 'development') {
    pool.end().catch(() => {})
    pool = null
  }
  
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set')
    }

    pool = new Pool({
      connectionString,
      max: 10, // Max connections (adjust for paid tier)
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: {
        rejectUnauthorized: false, // Required for Neon
      },
    })

    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err)
    })
  }

  return pool
}

/**
 * Execute a query with automatic connection management
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const pool = getPool()
  const result = await pool.query(text, params)
  return result.rows as T[]
}

/**
 * Execute a query and return first row or null
 */
export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] || null
}

/**
 * Execute multiple queries in a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool()
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Close all connections (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

/**
 * Check if database is reachable
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await query('SELECT 1')
    return true
  } catch {
    return false
  }
}

// Types for database models
export interface ModelRow {
  model_id: number
  chain_id: number
  owner: string
  creator: string
  name: string | null
  uri: string | null
  price_perpetual: string // bigint as string
  price_subscription: string // bigint as string
  default_duration_days: number
  listed: boolean
  version: number
  royalty_bps: number
  delivery_rights_default: number
  delivery_mode_hint: number
  terms_hash: string | null
  created_at: Date
  updated_at: Date
  indexed_at: Date
}

export interface ModelMetadataRow {
  model_id: number
  metadata: any // JSONB
  image_url: string | null
  categories: string[] | null
  tags: string[] | null
  industries: string[] | null
  use_cases: string[] | null
  frameworks: string[] | null
  architectures: string[] | null
  cached_at: Date
  cache_ttl: number
}

export interface LicenseRow {
  token_id: number
  chain_id: number
  model_id: number
  owner: string
  kind: number // 0=perpetual, 1=subscription
  revoked: boolean
  valid_api: boolean
  valid_download: boolean
  expires_at: string // bigint as string
  tx_hash: string | null
  block_number: string | null // bigint as string
  created_at: Date
  indexed_at: Date
}

export interface IndexerStateRow {
  id: number
  chain_id: number
  last_block_models: string // bigint as string
  last_block_licenses: string // bigint as string
  last_model_id: number
  last_license_id: number
  last_sync_at: Date
  status: 'idle' | 'syncing' | 'error'
}

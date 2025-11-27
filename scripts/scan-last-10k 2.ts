#!/usr/bin/env tsx
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

import { query } from '../src/lib/db'

async function main() {
  const chainId = 43113
  
  console.log(`🔄 Setting indexer to scan last 10k blocks for chain ${chainId}...`)
  
  // Set to scan from (current - 10000) blocks
  await query(
    `UPDATE indexer_state 
     SET last_block_licenses = (SELECT GREATEST(0, CAST(last_block_models AS BIGINT) - 10000))
     WHERE chain_id = $1`,
    [chainId]
  )
  
  const state = await query('SELECT * FROM indexer_state WHERE chain_id = $1', [chainId])
  console.log('Updated state:')
  console.table(state)
  
  console.log(`\n✅ Now run: npm run indexer -- --chain=${chainId}`)
  process.exit(0)
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})

#!/usr/bin/env tsx
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

import { query } from '../src/lib/db'

async function main() {
  const chainId = 43113
  
  console.log(`🔄 Resetting license scanning for chain ${chainId}...`)
  
  // Reset to scan from genesis (block 0)
  await query(
    `UPDATE indexer_state 
     SET last_block_licenses = 0
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

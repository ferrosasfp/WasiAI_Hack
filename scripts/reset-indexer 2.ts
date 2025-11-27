#!/usr/bin/env tsx
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

import { query } from '../src/lib/db'

async function main() {
  const chainId = 43113
  
  console.log(`🔄 Resetting indexer state for chain ${chainId}...`)
  
  await query(
    `UPDATE indexer_state 
     SET last_block_models = 0,
         last_block_licenses = 0,
         last_model_id = 0,
         last_license_id = 0,
         status = 'idle'
     WHERE chain_id = $1`,
    [chainId]
  )
  
  console.log(`✅ Reset complete. Run: npm run indexer -- --chain=${chainId}`)
  process.exit(0)
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})

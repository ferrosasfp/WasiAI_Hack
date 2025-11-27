#!/usr/bin/env tsx
/**
 * Indexer CLI script
 * Usage: npm run indexer -- --chain=43113
 */

import dotenv from 'dotenv'
import path from 'path'

// Load base .env and then override with .env.local if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

import { indexChain, cacheModelMetadata } from '../src/lib/indexer'
import { query } from '../src/lib/db'

async function main() {
  const args = process.argv.slice(2)
  const chainArg = args.find(arg => arg.startsWith('--chain='))
  const chainId = chainArg ? parseInt(chainArg.split('=')[1]) : null
  
  const maxBlocksArg = args.find(arg => arg.startsWith('--maxBlocks='))
  const maxBlocks = maxBlocksArg ? parseInt(maxBlocksArg.split('=')[1]) : undefined

  const chains = chainId ? [chainId] : [43113, 84532] // Default: Fuji + Base Sepolia

  console.log(`🚀 Starting indexer for chains: ${chains.join(', ')}`)
  console.log('Chain config env vars:', {
    NEXT_PUBLIC_EVM_MARKET_43113: process.env.NEXT_PUBLIC_EVM_MARKET_43113,
    NEXT_PUBLIC_EVM_MARKET_84532: process.env.NEXT_PUBLIC_EVM_MARKET_84532,
    NEXT_PUBLIC_AVALANCHE_FUJI_RPC: process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC,
  })

  for (const chain of chains) {
    try {
      const result = await indexChain({ chainId: chain, maxBlocks })
      console.log(`✅ Chain ${chain}: ${result.modelsIndexed} models, ${result.licensesIndexed} licenses, ${result.blocksScanned} blocks in ${result.duration}ms`)

      // Cache metadata for newly indexed models (max 10 per run to avoid timeout)
      if (result.modelsIndexed > 0) {
        const models = await query<{ model_id: number }>(
          'SELECT model_id FROM models WHERE chain_id = $1 AND model_id NOT IN (SELECT model_id FROM model_metadata) LIMIT 10',
          [chain]
        )

        for (const model of models) {
          await cacheModelMetadata(model.model_id)
        }
      }
    } catch (error) {
      console.error(`❌ Failed to index chain ${chain}:`, error)
      process.exit(1)
    }
  }

  console.log('✅ All chains indexed successfully')
  process.exit(0)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

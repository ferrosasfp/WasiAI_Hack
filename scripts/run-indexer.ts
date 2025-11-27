#!/usr/bin/env tsx
/**
 * Indexer CLI script
 * Usage: npm run indexer -- --chain=43113
 * 
 * IMPORTANT: dotenv must be loaded BEFORE any other imports
 * because chain config reads process.env at module load time
 */

// Load env vars FIRST - before any other imports
import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

async function run() {
  // Dynamic imports AFTER env vars are loaded
  const { indexChain, cacheModelMetadata } = await import('../src/lib/indexer')
  const { query } = await import('../src/lib/db')

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

      // Cache metadata for ALL models without cache (not just newly indexed)
      const models = await query<{ model_id: number, name: string }>(
        `SELECT m.model_id, m.name 
         FROM models m 
         LEFT JOIN model_metadata mm ON m.model_id = mm.model_id 
         WHERE m.chain_id = $1 
           AND m.uri IS NOT NULL 
           AND m.uri != '' 
           AND mm.model_id IS NULL
         ORDER BY m.model_id ASC`,
        [chain]
      )

      if (models.length > 0) {
        console.log(`📦 Found ${models.length} models without cached metadata`)
        let cached = 0
        for (const model of models) {
          try {
            console.log(`  ├─ Caching metadata for model ${model.model_id} (${model.name || 'unnamed'})...`)
            await cacheModelMetadata(model.model_id)
            cached++
          } catch (error) {
            console.error(`  ├─ ❌ Failed to cache model ${model.model_id}:`, error)
          }
        }
        console.log(`✅ Cached ${cached}/${models.length} model metadata`)
      } else {
        console.log(`✅ All models already have cached metadata`)
      }
    } catch (error) {
      console.error(`❌ Failed to index chain ${chain}:`, error)
      process.exit(1)
    }
  }

  console.log('✅ All chains indexed successfully')
  process.exit(0)
}

run().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

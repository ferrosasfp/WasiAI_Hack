#!/usr/bin/env tsx
/**
 * Cache metadata for all models that don't have it yet
 * Usage: npm run cache-metadata -- --chain=43113
 */

import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

import { cacheModelMetadata } from '../src/lib/indexer'
import { query } from '../src/lib/db'

async function main() {
  const args = process.argv.slice(2)
  const chainArg = args.find(arg => arg.startsWith('--chain='))
  const chainId = chainArg ? parseInt(chainArg.split('=')[1]) : null
  
  const limitArg = args.find(arg => arg.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 1000 // Process up to 1000 models

  const chains = chainId ? [chainId] : [43113, 84532] // Default: Fuji + Base Sepolia

  console.log(`🚀 Starting metadata caching for chains: ${chains.join(', ')}`)
  console.log(`📊 Will process up to ${limit} models per chain`)

  for (const chain of chains) {
    try {
      // Find all models without cached metadata
      const models = await query<{ model_id: number, name: string, uri: string }>(
        `SELECT m.model_id, m.name, m.uri 
         FROM models m 
         LEFT JOIN model_metadata mm ON m.model_id = mm.model_id 
         WHERE m.chain_id = $1 
           AND m.uri IS NOT NULL 
           AND m.uri != '' 
           AND mm.model_id IS NULL
         ORDER BY m.model_id ASC
         LIMIT $2`,
        [chain, limit]
      )

      console.log(`📦 Found ${models.length} models without cached metadata on chain ${chain}`)

      if (models.length === 0) {
        console.log(`✅ All models on chain ${chain} already have cached metadata!`)
        continue
      }

      let success = 0
      let failed = 0

      for (let i = 0; i < models.length; i++) {
        const model = models[i]
        try {
          console.log(`[${i + 1}/${models.length}] Caching metadata for model ${model.model_id} (${model.name || 'unnamed'})...`)
          await cacheModelMetadata(model.model_id)
          success++
          
          // Add a small delay to avoid overwhelming IPFS gateways
          if (i < models.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        } catch (error) {
          console.error(`❌ Failed to cache metadata for model ${model.model_id}:`, error)
          failed++
        }
      }

      console.log(`✅ Chain ${chain}: ${success} cached, ${failed} failed`)
    } catch (error) {
      console.error(`❌ Failed to process chain ${chain}:`, error)
    }
  }

  console.log('✅ Metadata caching complete')
  process.exit(0)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

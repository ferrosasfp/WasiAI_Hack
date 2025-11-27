#!/usr/bin/env tsx
/**
 * Force refresh metadata for ALL models (even if cached)
 * Usage: npm run refresh-metadata -- --chain=43113
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
  const chainId = chainArg ? parseInt(chainArg.split('=')[1]) : 43113

  console.log(`🔄 Force refreshing metadata for chain ${chainId}...`)

  // Get ALL models with URIs
  const models = await query<{ model_id: number, name: string, uri: string }>(
    `SELECT model_id, name, uri 
     FROM models 
     WHERE chain_id = $1 
       AND uri IS NOT NULL 
       AND uri != ''
     ORDER BY model_id ASC`,
    [chainId]
  )

  console.log(`📦 Found ${models.length} models to refresh`)

  if (models.length === 0) {
    console.log('⚠️  No models found with URIs')
    process.exit(0)
  }

  // First, delete all existing cached metadata to force refresh
  await query('DELETE FROM model_metadata WHERE model_id IN (SELECT model_id FROM models WHERE chain_id = $1)', [chainId])
  console.log('🗑️  Cleared existing metadata cache')

  let success = 0
  let failed = 0

  for (let i = 0; i < models.length; i++) {
    const model = models[i]
    try {
      console.log(`[${i + 1}/${models.length}] Caching model ${model.model_id}: ${model.name || 'unnamed'}`)
      console.log(`  URI: ${model.uri.substring(0, 60)}...`)
      
      await cacheModelMetadata(model.model_id)
      success++
      
      // Small delay to avoid overwhelming IPFS
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (error: any) {
      console.error(`  ❌ Failed: ${error.message}`)
      failed++
    }
  }

  console.log('')
  console.log('='.repeat(50))
  console.log(`✅ Refresh complete: ${success} cached, ${failed} failed`)
  console.log('='.repeat(50))
  
  // Show sample of what was cached
  const sample = await query<any>(
    `SELECT m.model_id, m.name, mm.categories, mm.tags, mm.image_url 
     FROM models m 
     LEFT JOIN model_metadata mm ON m.model_id = mm.model_id 
     WHERE m.chain_id = $1 
     LIMIT 3`,
    [chainId]
  )
  
  console.log('\n📊 Sample of cached data:')
  sample.forEach(s => {
    console.log(`\nModel ${s.model_id}: ${s.name}`)
    console.log(`  Categories: ${s.categories?.join(', ') || 'none'}`)
    console.log(`  Tags: ${s.tags?.join(', ') || 'none'}`)
    console.log(`  Image: ${s.image_url ? 'yes' : 'no'}`)
  })

  process.exit(0)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

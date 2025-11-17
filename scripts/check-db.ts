#!/usr/bin/env tsx
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

import { query } from '../src/lib/db'

async function main() {
  console.log('🔍 Checking database state...\n')

  const state = await query('SELECT * FROM indexer_state WHERE chain_id = 43113')
  console.log('Indexer state for chain 43113:')
  console.table(state)

  const modelsCount = await query('SELECT COUNT(*) as count FROM models')
  console.log(`\nModels in DB: ${modelsCount[0]?.count || 0}`)

  const licensesCount = await query('SELECT COUNT(*) as count FROM licenses')
  console.log(`Licenses in DB: ${licensesCount[0]?.count || 0}`)

  const models = await query('SELECT model_id, name, owner, listed FROM models LIMIT 5')
  if (models.length > 0) {
    console.log('\nFirst 5 models:')
    console.table(models)
  }

  process.exit(0)
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})

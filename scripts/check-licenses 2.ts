#!/usr/bin/env tsx
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

import { query } from '../src/lib/db'

async function main() {
  console.log('🔍 Checking licenses...\n')

  const licenses = await query(`
    SELECT 
      token_id, 
      model_id, 
      owner, 
      kind, 
      revoked, 
      valid_api, 
      valid_download,
      expires_at,
      created_at
    FROM licenses 
    ORDER BY token_id
  `)

  console.log(`Found ${licenses.length} licenses:\n`)
  
  licenses.forEach((lic: any) => {
    console.log(`License #${lic.token_id}:`)
    console.log(`  Model: ${lic.model_id}`)
    console.log(`  Owner: ${lic.owner}`)
    console.log(`  Type: ${lic.kind === 0 ? 'PERPETUAL' : 'SUBSCRIPTION'}`)
    console.log(`  Revoked: ${lic.revoked}`)
    console.log(`  Valid API: ${lic.valid_api}`)
    console.log(`  Valid Download: ${lic.valid_download}`)
    console.log(`  Expires at: ${lic.expires_at === '0' ? 'Never' : new Date(Number(lic.expires_at) * 1000).toLocaleString()}`)
    console.log(`  Created: ${new Date(lic.created_at).toLocaleString()}\n`)
  })

  process.exit(0)
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})

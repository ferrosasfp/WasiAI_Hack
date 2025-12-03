/**
 * Clean all data for fresh start
 * - Clears Neon database tables
 * - Unpins all files from Pinata
 * - Clears local cache
 * 
 * Usage:
 *   node scripts/clean-all.js
 */

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

async function cleanDatabase() {
  console.log('🗄️  Cleaning Neon database...')
  
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.log('   ⚠️ DATABASE_URL not set, skipping database cleanup')
    return
  }
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })
  
  try {
    // Delete in order to respect foreign keys
    await pool.query('DELETE FROM model_metadata')
    console.log('   ✅ Cleared model_metadata')
    
    await pool.query('DELETE FROM licenses')
    console.log('   ✅ Cleared licenses')
    
    await pool.query('DELETE FROM models')
    console.log('   ✅ Cleared models')
    
    await pool.query('DELETE FROM indexer_state')
    console.log('   ✅ Cleared indexer_state')
    
    // Reset sequences if they exist
    try {
      await pool.query('ALTER SEQUENCE IF EXISTS models_id_seq RESTART WITH 1')
      await pool.query('ALTER SEQUENCE IF EXISTS licenses_id_seq RESTART WITH 1')
    } catch (e) {
      // Sequences might not exist
    }
    
  } catch (error) {
    console.log(`   ⚠️ Database error: ${error.message}`)
  } finally {
    await pool.end()
  }
}

async function cleanPinata() {
  console.log('')
  console.log('📌 Cleaning Pinata pins...')
  
  const jwt = process.env.PINATA_JWT
  const apiKey = process.env.PINATA_API_KEY
  const secretKey = process.env.PINATA_SECRET_KEY
  
  if (!jwt && (!apiKey || !secretKey)) {
    console.log('   ⚠️ Pinata credentials not set, skipping')
    return
  }
  
  const headers = {}
  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`
  } else {
    headers['pinata_api_key'] = apiKey
    headers['pinata_secret_api_key'] = secretKey
  }
  
  try {
    // Get all pins
    const fetch = (await import('node-fetch')).default
    const listRes = await fetch('https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=1000', {
      headers
    })
    
    if (!listRes.ok) {
      console.log(`   ⚠️ Failed to list pins: ${listRes.status}`)
      return
    }
    
    const data = await listRes.json()
    const pins = data.rows || []
    
    if (pins.length === 0) {
      console.log('   ✅ No pins to remove')
      return
    }
    
    console.log(`   Found ${pins.length} pins to remove`)
    
    // Unpin each one
    let removed = 0
    for (const pin of pins) {
      try {
        const unpinRes = await fetch(`https://api.pinata.cloud/pinning/unpin/${pin.ipfs_pin_hash}`, {
          method: 'DELETE',
          headers
        })
        if (unpinRes.ok) {
          removed++
        }
      } catch (e) {
        // Continue on error
      }
    }
    
    console.log(`   ✅ Removed ${removed}/${pins.length} pins`)
    
  } catch (error) {
    console.log(`   ⚠️ Pinata error: ${error.message}`)
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('Clean All Data')
  console.log('='.repeat(60))
  console.log('')
  
  await cleanDatabase()
  await cleanPinata()
  
  console.log('')
  console.log('='.repeat(60))
  console.log('✅ Cleanup complete!')
  console.log('='.repeat(60))
  console.log('')
  console.log('Next steps:')
  console.log('1. Restart the dev server: npm run dev')
  console.log('2. Run the test: node scripts/test-full-publish-flow.js')
  console.log('')
}

main().catch(console.error)

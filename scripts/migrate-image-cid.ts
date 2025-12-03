// @ts-ignore
const { Pool } = require('pg')
// @ts-ignore  
const dotenv = require('dotenv')

// Load environment variables
dotenv.config({ path: '.env.local' })

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })
  
  try {
    // Add image_cid column
    await pool.query('ALTER TABLE model_metadata ADD COLUMN IF NOT EXISTS image_cid VARCHAR(100)')
    console.log('✅ Migration successful: image_cid column added')
    
    // Add index
    await pool.query('CREATE INDEX IF NOT EXISTS idx_model_metadata_image_cid ON model_metadata(image_cid) WHERE image_cid IS NOT NULL')
    console.log('✅ Index created on image_cid')
    
    await pool.end()
  } catch (e: any) {
    console.error('❌ Migration error:', e.message)
    await pool.end()
    process.exit(1)
  }
  
  process.exit(0)
}

migrate()

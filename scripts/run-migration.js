/**
 * Run database migration for agent_reputation tables
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: '.env.local' })

async function runMigration() {
  const connectionString = process.env.DATABASE_URL
  
  if (!connectionString) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('Connecting to database...')
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../db/migrations/001_agent_reputation.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('Running migration...')
    await pool.query(sql)
    
    console.log('✅ Migration completed successfully!')
    
    // Verify tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('agent_reputation', 'feedback_history')
    `)
    
    console.log('Created tables:', tables.rows.map(r => r.table_name).join(', '))
    
  } catch (error) {
    console.error('Migration failed:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()

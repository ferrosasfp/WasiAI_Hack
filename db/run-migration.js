/**
 * Run database migration
 * Usage: node db/run-migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL || 
    'postgresql://neondb_owner:npg_o13lrWRXBHdZ@ep-weathered-cloud-ac0l65rx-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
  
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    console.log('🔄 Connecting to database...');
    const client = await pool.connect();
    
    console.log('📄 Reading migration file...');
    const migrationPath = path.join(__dirname, 'migrations/002_inference_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Running migration...');
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the changes
    console.log('\n📊 Verifying changes...');
    
    // Check models table columns
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'models' 
      AND column_name IN ('price_inference', 'inference_wallet', 'inference_endpoint')
    `);
    console.log('Models table new columns:', columnsResult.rows);
    
    // Check new tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('inference_payments', 'inference_balances')
    `);
    console.log('New tables created:', tablesResult.rows.map(r => r.table_name));
    
    client.release();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

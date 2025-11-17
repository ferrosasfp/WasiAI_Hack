-- MarketplaceAI Database Schema
-- Compatible with Neon Postgres FREE tier (3GB)
-- Scalable to paid tiers

-- ============================================
-- MODELS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS models (
  model_id INTEGER PRIMARY KEY,
  chain_id INTEGER NOT NULL,
  owner TEXT NOT NULL,
  creator TEXT NOT NULL,
  name TEXT,
  uri TEXT,
  price_perpetual BIGINT DEFAULT 0,
  price_subscription BIGINT DEFAULT 0,
  default_duration_days INTEGER DEFAULT 0,
  listed BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  royalty_bps INTEGER DEFAULT 0,
  delivery_rights_default INTEGER DEFAULT 0,
  delivery_mode_hint INTEGER DEFAULT 0,
  terms_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  indexed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_models_listed ON models(listed, created_at DESC) WHERE listed = true;
CREATE INDEX IF NOT EXISTS idx_models_owner ON models(owner);
CREATE INDEX IF NOT EXISTS idx_models_chain ON models(chain_id, listed, created_at DESC);

-- ============================================
-- MODEL METADATA CACHE (IPFS data)
-- ============================================
CREATE TABLE IF NOT EXISTS model_metadata (
  model_id INTEGER PRIMARY KEY REFERENCES models(model_id) ON DELETE CASCADE,
  metadata JSONB NOT NULL,
  image_url TEXT,
  categories TEXT[],
  tags TEXT[],
  industries TEXT[],
  use_cases TEXT[],
  frameworks TEXT[],
  architectures TEXT[],
  cached_at TIMESTAMP DEFAULT NOW(),
  cache_ttl INTEGER DEFAULT 86400 -- 24 hours in seconds
);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_metadata_json ON model_metadata USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_metadata_categories ON model_metadata USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_metadata_tags ON model_metadata USING GIN(tags);

-- ============================================
-- LICENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS licenses (
  token_id INTEGER NOT NULL,
  chain_id INTEGER NOT NULL,
  model_id INTEGER NOT NULL REFERENCES models(model_id),
  owner TEXT NOT NULL,
  kind INTEGER NOT NULL, -- 0=perpetual, 1=subscription
  revoked BOOLEAN DEFAULT false,
  valid_api BOOLEAN DEFAULT false,
  valid_download BOOLEAN DEFAULT false,
  expires_at BIGINT DEFAULT 0,
  tx_hash TEXT,
  block_number BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  indexed_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (chain_id, token_id)
);

-- Indexes for user license queries
CREATE INDEX IF NOT EXISTS idx_licenses_owner ON licenses(owner, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_licenses_model ON licenses(model_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_licenses_chain ON licenses(chain_id, token_id);

-- ============================================
-- INDEXER STATE (track sync progress)
-- ============================================
CREATE TABLE IF NOT EXISTS indexer_state (
  id SERIAL PRIMARY KEY,
  chain_id INTEGER NOT NULL UNIQUE,
  last_block_models BIGINT DEFAULT 0,
  last_block_licenses BIGINT DEFAULT 0,
  last_model_id INTEGER DEFAULT 0,
  last_license_id INTEGER DEFAULT 0,
  last_sync_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'idle' -- idle, syncing, error
);

-- Insert default state for supported chains
INSERT INTO indexer_state (chain_id, last_block_models, last_block_licenses)
VALUES 
  (43113, 0, 0), -- Avalanche Fuji
  (43114, 0, 0), -- Avalanche Mainnet
  (84532, 0, 0), -- Base Sepolia
  (8453, 0, 0)   -- Base Mainnet
ON CONFLICT (chain_id) DO NOTHING;

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Models with metadata (most common query)
CREATE OR REPLACE VIEW models_enriched AS
SELECT 
  m.*,
  mm.metadata,
  mm.image_url,
  mm.categories,
  mm.tags,
  mm.industries,
  mm.use_cases,
  mm.cached_at
FROM models m
LEFT JOIN model_metadata mm ON m.model_id = mm.model_id;

-- User licenses with model info
CREATE OR REPLACE VIEW user_licenses_enriched AS
SELECT 
  l.*,
  m.name as model_name,
  m.uri as model_uri,
  mm.image_url as model_image,
  mm.metadata as model_metadata
FROM licenses l
JOIN models m ON l.model_id = m.model_id
LEFT JOIN model_metadata mm ON l.model_id = mm.model_id;

-- ============================================
-- FUNCTIONS FOR MAINTENANCE
-- ============================================

-- Function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_cache() RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM model_metadata 
  WHERE cached_at + (cache_ttl * INTERVAL '1 second') < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update model stats (for future use)
CREATE OR REPLACE FUNCTION update_model_stats() RETURNS void AS $$
BEGIN
  -- Placeholder for future stats aggregation
  -- e.g., license_count, total_revenue, etc.
  NULL;
END;
$$ LANGUAGE plpgsql;

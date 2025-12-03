-- Migration: Add agents table for AgentRegistryV2 (ERC-8004)
-- Date: 2024-12-02
-- Description: Creates agents table to store ERC-8004 agent identities
--              linked to models via MarketplaceV2

-- ============================================
-- CREATE AGENTS TABLE
-- ============================================

-- Agents are ERC-8004 NFTs that represent AI agent identities
-- Each agent is linked to a model in the Marketplace
CREATE TABLE IF NOT EXISTS agents (
  agent_id INTEGER PRIMARY KEY,
  chain_id INTEGER NOT NULL,
  model_id INTEGER NOT NULL REFERENCES models(model_id),
  owner TEXT NOT NULL,                    -- NFT owner address
  wallet TEXT NOT NULL,                   -- Payment wallet for x402
  endpoint TEXT,                          -- x402 inference endpoint URL
  metadata_uri TEXT,                      -- IPFS URI to ERC-8004 metadata
  registered_at BIGINT NOT NULL,          -- Block timestamp of registration
  active BOOLEAN DEFAULT true,            -- Whether agent is active
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  indexed_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ADD AGENT_ID TO MODELS TABLE
-- ============================================

-- Link model to its agent (1:1 relationship)
ALTER TABLE models 
ADD COLUMN IF NOT EXISTS agent_id INTEGER;

-- Add foreign key constraint (optional, for data integrity)
-- Note: We don't add FK constraint to avoid circular dependency issues
-- The relationship is maintained by the indexer

-- ============================================
-- INDEXES FOR AGENTS TABLE
-- ============================================

-- Index for finding agent by model
CREATE INDEX IF NOT EXISTS idx_agents_model 
ON agents(model_id);

-- Index for finding agents by owner
CREATE INDEX IF NOT EXISTS idx_agents_owner 
ON agents(owner);

-- Index for active agents
CREATE INDEX IF NOT EXISTS idx_agents_active 
ON agents(active) 
WHERE active = true;

-- Index for chain-specific queries
CREATE INDEX IF NOT EXISTS idx_agents_chain 
ON agents(chain_id, active);

-- ============================================
-- UPDATE INDEXER STATE
-- ============================================

-- Add columns to track agent indexing progress
ALTER TABLE indexer_state 
ADD COLUMN IF NOT EXISTS last_agent_id INTEGER DEFAULT 0;

ALTER TABLE indexer_state 
ADD COLUMN IF NOT EXISTS last_block_agents BIGINT DEFAULT 0;

-- ============================================
-- CREATE AGENT METADATA CACHE TABLE
-- ============================================

-- Cache ERC-8004 metadata from IPFS
CREATE TABLE IF NOT EXISTS agent_metadata (
  agent_id INTEGER PRIMARY KEY REFERENCES agents(agent_id) ON DELETE CASCADE,
  metadata JSONB NOT NULL,
  name TEXT,                              -- Agent name from metadata
  description TEXT,                       -- Agent description
  image_url TEXT,                         -- Agent avatar/image
  capabilities TEXT[],                    -- Agent capabilities
  cached_at TIMESTAMP DEFAULT NOW(),
  cache_ttl INTEGER DEFAULT 86400         -- 24 hours in seconds
);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_agent_metadata_json 
ON agent_metadata USING GIN(metadata);

-- ============================================
-- UPDATE VIEWS
-- ============================================

-- Drop and recreate models_enriched view to include agent data
DROP VIEW IF EXISTS models_enriched CASCADE;

CREATE VIEW models_enriched AS
SELECT 
  m.*,
  mm.metadata,
  mm.image_url,
  mm.categories,
  mm.tags,
  mm.industries,
  mm.use_cases,
  mm.frameworks,
  mm.architectures,
  mm.cached_at,
  a.agent_id,
  a.wallet as agent_wallet,
  a.endpoint as agent_endpoint,
  a.active as agent_active,
  am.name as agent_name,
  am.capabilities as agent_capabilities
FROM models m
LEFT JOIN model_metadata mm ON m.model_id = mm.model_id
LEFT JOIN agents a ON m.model_id = a.model_id
LEFT JOIN agent_metadata am ON a.agent_id = am.agent_id;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE agents IS 'ERC-8004 agent identities from AgentRegistryV2. Each agent is linked to a model.';
COMMENT ON COLUMN agents.agent_id IS 'ERC-8004 NFT token ID from AgentRegistryV2';
COMMENT ON COLUMN agents.model_id IS 'Reference to the model in MarketplaceV2';
COMMENT ON COLUMN agents.wallet IS 'Wallet address to receive x402 inference payments';
COMMENT ON COLUMN agents.endpoint IS 'URL of the x402 inference endpoint';
COMMENT ON COLUMN agents.metadata_uri IS 'IPFS URI to ERC-8004 compliant metadata JSON';
COMMENT ON COLUMN agents.registered_at IS 'Block timestamp when agent was registered';
COMMENT ON COLUMN agents.active IS 'Whether the agent is active (can be deactivated by owner)';
COMMENT ON COLUMN models.agent_id IS 'Reference to the linked agent in AgentRegistryV2';

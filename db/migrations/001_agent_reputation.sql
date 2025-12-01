-- Migration: Add agent_reputation table
-- Source of truth: ReputationRegistry smart contract on Avalanche Fuji
-- This table is a cache for faster reads

-- ============================================
-- AGENT REPUTATION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agent_reputation (
  agent_id INTEGER PRIMARY KEY,
  chain_id INTEGER NOT NULL DEFAULT 43113,
  positive_count INTEGER DEFAULT 0,
  negative_count INTEGER DEFAULT 0,
  total_feedback INTEGER DEFAULT 0,
  score INTEGER DEFAULT 50, -- 0-100 percentage
  last_feedback_at TIMESTAMP,
  last_synced_block BIGINT DEFAULT 0,
  synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_reputation_chain ON agent_reputation(chain_id);
CREATE INDEX IF NOT EXISTS idx_reputation_score ON agent_reputation(score DESC);

-- ============================================
-- FEEDBACK HISTORY TABLE (optional, for audit)
-- ============================================
CREATE TABLE IF NOT EXISTS feedback_history (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL,
  chain_id INTEGER NOT NULL DEFAULT 43113,
  user_address TEXT NOT NULL,
  positive BOOLEAN NOT NULL,
  inference_hash TEXT NOT NULL,
  tx_hash TEXT,
  block_number BIGINT,
  feedback_at TIMESTAMP NOT NULL,
  indexed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(chain_id, inference_hash)
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_feedback_agent ON feedback_history(agent_id, feedback_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback_history(user_address, feedback_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_block ON feedback_history(chain_id, block_number);

-- ============================================
-- VIEW: Models with reputation
-- ============================================
CREATE OR REPLACE VIEW models_with_reputation AS
SELECT 
  m.*,
  mm.metadata,
  mm.image_url,
  mm.categories,
  mm.tags,
  COALESCE(ar.positive_count, 0) as reputation_positive,
  COALESCE(ar.negative_count, 0) as reputation_negative,
  COALESCE(ar.total_feedback, 0) as reputation_total,
  COALESCE(ar.score, 50) as reputation_score,
  ar.synced_at as reputation_synced_at
FROM models m
LEFT JOIN model_metadata mm ON m.model_id = mm.model_id
LEFT JOIN agent_reputation ar ON m.model_id = ar.agent_id;

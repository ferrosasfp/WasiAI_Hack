-- Migration: Add inference fields to models table
-- Date: 2024-12-02
-- Description: Adds price_inference, inference_wallet, and inference_endpoint columns
--              for x402 pay-per-inference support

-- ============================================
-- ADD INFERENCE COLUMNS TO MODELS TABLE
-- ============================================

-- Price per inference in USDC base units (6 decimals)
-- e.g., 10000 = $0.01 USDC
ALTER TABLE models 
ADD COLUMN IF NOT EXISTS price_inference BIGINT DEFAULT 0;

-- Wallet address to receive x402 payments
ALTER TABLE models 
ADD COLUMN IF NOT EXISTS inference_wallet TEXT;

-- x402 inference endpoint URL
ALTER TABLE models 
ADD COLUMN IF NOT EXISTS inference_endpoint TEXT;

-- ============================================
-- ADD INDEXES FOR INFERENCE QUERIES
-- ============================================

-- Index for models with inference enabled (price > 0)
CREATE INDEX IF NOT EXISTS idx_models_inference 
ON models(price_inference) 
WHERE price_inference > 0;

-- Index for filtering by inference wallet
CREATE INDEX IF NOT EXISTS idx_models_inference_wallet 
ON models(inference_wallet) 
WHERE inference_wallet IS NOT NULL;

-- ============================================
-- UPDATE MODEL_METADATA TABLE
-- ============================================

-- Add inference config to metadata cache
ALTER TABLE model_metadata 
ADD COLUMN IF NOT EXISTS inference_config JSONB;

-- ============================================
-- CREATE INFERENCE_PAYMENTS TABLE
-- ============================================

-- Track inference payments for analytics and split distribution
CREATE TABLE IF NOT EXISTS inference_payments (
  id SERIAL PRIMARY KEY,
  model_id INTEGER NOT NULL REFERENCES models(model_id),
  chain_id INTEGER NOT NULL,
  payer TEXT NOT NULL,                    -- User who paid
  amount BIGINT NOT NULL,                 -- Amount in USDC base units
  seller_amount BIGINT NOT NULL,          -- Amount to seller
  creator_amount BIGINT NOT NULL,         -- Amount to creator (royalty)
  marketplace_amount BIGINT NOT NULL,     -- Amount to marketplace (fee)
  tx_hash TEXT,                           -- x402 payment transaction hash
  inference_hash TEXT,                    -- Unique inference identifier
  status TEXT DEFAULT 'pending',          -- pending, distributed, failed
  created_at TIMESTAMP DEFAULT NOW(),
  distributed_at TIMESTAMP
);

-- Indexes for inference payments
CREATE INDEX IF NOT EXISTS idx_inference_payments_model 
ON inference_payments(model_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inference_payments_payer 
ON inference_payments(payer, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inference_payments_status 
ON inference_payments(status) 
WHERE status = 'pending';

-- ============================================
-- CREATE INFERENCE_BALANCES TABLE (Pull Pattern)
-- ============================================

-- Track accumulated balances for pull-pattern withdrawals
CREATE TABLE IF NOT EXISTS inference_balances (
  wallet TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  balance BIGINT DEFAULT 0,               -- Accumulated balance in USDC base units
  total_earned BIGINT DEFAULT 0,          -- Total earned all time
  total_withdrawn BIGINT DEFAULT 0,       -- Total withdrawn all time
  last_payment_at TIMESTAMP,
  last_withdrawal_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (wallet, chain_id)
);

-- Index for wallets with balance
CREATE INDEX IF NOT EXISTS idx_inference_balances_positive 
ON inference_balances(balance DESC) 
WHERE balance > 0;

-- ============================================
-- MIGRATE EXISTING DATA
-- ============================================

-- Update existing models with inference config from metadata JSONB
UPDATE models m
SET 
  price_inference = COALESCE(
    (
      SELECT (mm.metadata->'licensePolicy'->'inference'->>'pricePerCall')::NUMERIC * 1000000
      FROM model_metadata mm 
      WHERE mm.model_id = m.model_id
    )::BIGINT,
    0
  ),
  inference_wallet = COALESCE(
    (
      SELECT mm.metadata->'step3'->'inferenceConfig'->>'wallet'
      FROM model_metadata mm 
      WHERE mm.model_id = m.model_id
    ),
    m.owner
  ),
  inference_endpoint = (
    SELECT mm.metadata->'step3'->'inferenceConfig'->>'endpoint'
    FROM model_metadata mm 
    WHERE mm.model_id = m.model_id
  )
WHERE EXISTS (
  SELECT 1 FROM model_metadata mm 
  WHERE mm.model_id = m.model_id 
  AND mm.metadata->'licensePolicy'->'inference' IS NOT NULL
);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN models.price_inference IS 'Price per inference in USDC base units (6 decimals). 0 = inference not enabled.';
COMMENT ON COLUMN models.inference_wallet IS 'Wallet address to receive x402 inference payments.';
COMMENT ON COLUMN models.inference_endpoint IS 'URL of the x402 inference endpoint.';
COMMENT ON TABLE inference_payments IS 'Tracks all inference payments for analytics and revenue split distribution.';
COMMENT ON TABLE inference_balances IS 'Accumulated balances for pull-pattern withdrawals (InferenceSplitter).';

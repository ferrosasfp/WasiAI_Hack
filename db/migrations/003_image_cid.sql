-- Migration: Add image_cid column to model_metadata
-- Purpose: Store IPFS CID separately from derived HTTP URL
-- This maintains Dapp integrity by keeping the source of truth (IPFS CID)
-- separate from the cached/derived value (HTTP gateway URL)

-- Add image_cid column if it doesn't exist
ALTER TABLE model_metadata 
ADD COLUMN IF NOT EXISTS image_cid VARCHAR(100);

-- Add comment explaining the column purpose
COMMENT ON COLUMN model_metadata.image_cid IS 'IPFS CID of the model cover image (source of truth). Format: Qm... or bafy...';
COMMENT ON COLUMN model_metadata.image_url IS 'Derived HTTP gateway URL from image_cid. Used for display, can be regenerated from image_cid.';

-- Create index for faster lookups by CID (useful for deduplication)
CREATE INDEX IF NOT EXISTS idx_model_metadata_image_cid ON model_metadata(image_cid) WHERE image_cid IS NOT NULL;

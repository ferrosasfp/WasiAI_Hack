-- Migration 004: Add slug column to models table for family versioning
-- The slug is used to identify model families (same owner + slug = same family)

-- Add slug column
ALTER TABLE models ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create index for efficient family lookups
CREATE INDEX IF NOT EXISTS idx_models_owner_slug ON models(owner, slug);

-- Create index for filtering latest versions
CREATE INDEX IF NOT EXISTS idx_models_version ON models(version DESC);

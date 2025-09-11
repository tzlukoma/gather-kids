-- Migration: Fix preferredScriptureTranslation column mismatch
-- The code expects camelCase but database has snake_case

-- Add the camelCase column if it doesn't exist
ALTER TABLE households ADD COLUMN IF NOT EXISTS "preferredScriptureTranslation" text;

-- Migrate data from snake_case to camelCase
UPDATE households 
SET "preferredScriptureTranslation" = preferred_scripture_translation 
WHERE "preferredScriptureTranslation" IS NULL AND preferred_scripture_translation IS NOT NULL;

-- Also ensure we have the 'name' column (migration-safe)
ALTER TABLE households ADD COLUMN IF NOT EXISTS name text;
UPDATE households 
SET name = household_name 
WHERE name IS NULL AND household_name IS NOT NULL;

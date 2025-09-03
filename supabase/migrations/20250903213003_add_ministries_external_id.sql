-- Migration: Add external_id and allows_checkin to ministries table
-- 
-- This migration adds the external_id column to the ministries table that is required
-- by the UAT seed script to work properly. Also adds allows_checkin for ministry configuration.

BEGIN;

-- Add external_id column for client-generated IDs (similar to other tables)
ALTER TABLE IF EXISTS ministries ADD COLUMN IF NOT EXISTS external_id text;

-- Add allows_checkin column for ministry configuration  
ALTER TABLE IF EXISTS ministries ADD COLUMN IF NOT EXISTS allows_checkin boolean DEFAULT true;

-- Add index for quick lookup by external_id
CREATE INDEX IF NOT EXISTS ministries_external_id_idx ON ministries (external_id);

COMMIT;
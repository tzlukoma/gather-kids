-- Migration: add external id columns to accept client-generated string IDs

ALTER TABLE IF EXISTS households ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE IF EXISTS guardians ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE IF EXISTS guardians ADD COLUMN IF NOT EXISTS external_household_id text;
ALTER TABLE IF EXISTS children ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE IF EXISTS children ADD COLUMN IF NOT EXISTS external_household_id text;

-- Indexes for quick lookup
CREATE INDEX IF NOT EXISTS households_external_id_idx ON households (external_id);
CREATE INDEX IF NOT EXISTS guardians_external_id_idx ON guardians (external_id);
CREATE INDEX IF NOT EXISTS children_external_id_idx ON children (external_id);
CREATE INDEX IF NOT EXISTS guardians_external_household_id_idx ON guardians (external_household_id);
CREATE INDEX IF NOT EXISTS children_external_household_id_idx ON children (external_household_id);

-- Migration: add UUID surrogate columns and FK mappings (safe, non-destructive)
-- Adds household_uuid to households, guardians, children and populates from existing household_id
-- Leaves original text ids in place as external identifiers.

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Add surrogate uuid column to households
ALTER TABLE IF EXISTS households
  ADD COLUMN IF NOT EXISTS household_uuid uuid DEFAULT gen_random_uuid();

-- Populate any NULLs explicitly (default covers new rows but ensure existing rows have values)
UPDATE households SET household_uuid = gen_random_uuid() WHERE household_uuid IS NULL;

-- Make surrogate unique and not null
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'households_household_uuid_key') THEN
    ALTER TABLE households ADD CONSTRAINT households_household_uuid_key UNIQUE (household_uuid);
  END IF;
END$$;
ALTER TABLE IF EXISTS households ALTER COLUMN household_uuid SET NOT NULL;

-- 2) Add surrogate columns to referencing tables and populate them
ALTER TABLE IF EXISTS guardians ADD COLUMN IF NOT EXISTS household_uuid uuid;
UPDATE guardians g SET household_uuid = h.household_uuid FROM households h WHERE g.household_id = h.household_id;
ALTER TABLE IF EXISTS children ADD COLUMN IF NOT EXISTS household_uuid uuid;
UPDATE children c SET household_uuid = h.household_uuid FROM households h WHERE c.household_id = h.household_id;

-- 3) Add indexes / FK constraints (do not drop old FKs)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'guardians_household_uuid_fkey') THEN
    ALTER TABLE guardians ADD CONSTRAINT guardians_household_uuid_fkey FOREIGN KEY (household_uuid) REFERENCES households(household_uuid) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'children_household_uuid_fkey') THEN
    ALTER TABLE children ADD CONSTRAINT children_household_uuid_fkey FOREIGN KEY (household_uuid) REFERENCES households(household_uuid) ON DELETE SET NULL;
  END IF;
END$$;

-- 4) Add indexes to speed lookups
CREATE INDEX IF NOT EXISTS households_household_uuid_idx ON households (household_uuid);
CREATE INDEX IF NOT EXISTS guardians_household_uuid_idx ON guardians (household_uuid);
CREATE INDEX IF NOT EXISTS children_household_uuid_idx ON children (household_uuid);

-- Note: we keep original text id columns (household_id, guardian_id, child_id) as external identifiers.

-- Migration: allow referencing household_id in related tables to be nullable
-- This lets us import rows using external_id without failing NOT NULL constraints
-- Note: Primary key column households.household_id cannot be nullable

-- Only make foreign key columns nullable
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guardians' AND column_name='household_id') THEN
		ALTER TABLE IF EXISTS guardians ALTER COLUMN household_id DROP NOT NULL;
	END IF;
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='children' AND column_name='household_id') THEN
		ALTER TABLE IF EXISTS children ALTER COLUMN household_id DROP NOT NULL;
	END IF;
END$$;

-- Migration: Safe migration for handling non-existent tables
-- This migration ensures that ALTER TABLE commands don't fail if tables don't exist

-- This is specifically to prevent the error:
-- ERROR: column "household_id" of relation "children" does not exist (SQLSTATE 42703)
-- At statement: 5 ALTER TABLE IF EXISTS children ALTER COLUMN household_id DROP DEFAULT

BEGIN;

-- Create check function to safely drop defaults
CREATE OR REPLACE FUNCTION safe_drop_default(tbl text, col text) RETURNS void AS $$
BEGIN
    -- Check if the table and column exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = tbl 
        AND column_name = col
    ) THEN
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT', tbl, col);
        RAISE NOTICE 'Dropped default for %.%', tbl, col;
    ELSE
        RAISE NOTICE 'Column %.% does not exist, skipping', tbl, col;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping default for %.%: %', tbl, col, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Safely handle the specific cases that might fail
SELECT safe_drop_default('guardians', 'household_id');
SELECT safe_drop_default('children', 'household_id');
SELECT safe_drop_default('guardians', 'guardian_id');
SELECT safe_drop_default('children', 'child_id');
SELECT safe_drop_default('households', 'household_id');

-- Clean up the function when done
DROP FUNCTION IF EXISTS safe_drop_default;

COMMIT;

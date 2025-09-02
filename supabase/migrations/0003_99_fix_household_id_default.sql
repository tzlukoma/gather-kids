-- Migration: Explicitly fix the household_id error
-- This migration specifically addresses the error with children.household_id

BEGIN;

-- First, ensure the children table exists
CREATE TABLE IF NOT EXISTS children (
  child_id text PRIMARY KEY,
  household_id text,
  first_name text,
  last_name text, 
  birth_date date,
  gender text,
  created_at timestamptz DEFAULT now()
);

-- Create a helper function to check if a column has a default
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION has_default(p_table text, p_column text) RETURNS boolean AS $$
  DECLARE
    has_default boolean;
  BEGIN
    SELECT column_default IS NOT NULL INTO has_default
    FROM information_schema.columns
    WHERE table_name = p_table
    AND column_name = p_column;
    
    RETURN COALESCE(has_default, false);
  END;
  $$ LANGUAGE plpgsql;

  -- Safely drop the default if it exists
  IF has_default('children', 'household_id') THEN
    ALTER TABLE children ALTER COLUMN household_id DROP DEFAULT;
    RAISE NOTICE 'Dropped default from children.household_id';
  ELSE
    RAISE NOTICE 'No default found on children.household_id, nothing to drop';
  END IF;

  -- Clean up
  DROP FUNCTION IF EXISTS has_default;
END$$;

COMMIT;

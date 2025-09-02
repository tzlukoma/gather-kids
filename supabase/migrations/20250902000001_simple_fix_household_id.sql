-- Migration: Simple fix for household_id default
-- This migration specifically addresses the error with children.household_id
-- Simpler version without complex function definitions

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

-- Check if the column exists and has a default
DO $$
DECLARE
  col_exists boolean;
  has_default boolean;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'children' AND column_name = 'household_id'
  ) INTO col_exists;
  
  -- If column exists, check if it has a default
  IF col_exists THEN
    SELECT column_default IS NOT NULL INTO has_default
    FROM information_schema.columns
    WHERE table_name = 'children' AND column_name = 'household_id';
    
    -- If has default, drop it
    IF has_default THEN
      EXECUTE 'ALTER TABLE children ALTER COLUMN household_id DROP DEFAULT';
      RAISE NOTICE 'Dropped default from children.household_id';
    ELSE
      RAISE NOTICE 'No default found on children.household_id, nothing to drop';
    END IF;
  ELSE
    RAISE NOTICE 'Column children.household_id does not exist yet, nothing to do';
  END IF;
END;
$$;

COMMIT;

-- Migration: Direct fix for household_id error
-- This migration directly addresses the specific error message with minimal complexity

BEGIN;

-- First, create the children table if it doesn't exist
CREATE TABLE IF NOT EXISTS children (
  child_id text PRIMARY KEY,
  household_id text,
  first_name text,
  last_name text,
  birth_date date,
  gender text,
  created_at timestamptz DEFAULT now()
);

-- Then check if household_id column exists
DO $$
BEGIN
  -- If the column exists, try to drop its default
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'children' AND column_name = 'household_id'
  ) THEN
    -- Try to drop the default - wrapped in exception handler
    BEGIN
      ALTER TABLE children ALTER COLUMN household_id DROP DEFAULT;
      RAISE NOTICE 'Successfully dropped default from children.household_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop default from children.household_id: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Column children.household_id does not exist, will be created by other migrations';
  END IF;
END $$;

COMMIT;

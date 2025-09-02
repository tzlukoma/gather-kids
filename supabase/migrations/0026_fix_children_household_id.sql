-- Migration: Fix children table household_id column 
-- This migration ensures the children table has a household_id column of text type
-- and properly references the households table's household_id column

BEGIN;

-- First, check if the column exists
DO $$
BEGIN
  -- Add the column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'children' 
    AND column_name = 'household_id'
  ) THEN
    -- Add the column as text type (to match our current schema)
    ALTER TABLE children ADD COLUMN household_id text;
    
    -- Update it with values from external_household_id if available
    UPDATE children 
    SET household_id = external_household_id 
    WHERE external_household_id IS NOT NULL;
    
    RAISE NOTICE 'Added missing household_id column to children table';
  ELSE
    RAISE NOTICE 'children.household_id column already exists';
  END IF;
  
  -- Ensure the column is of text type (not uuid)
  ALTER TABLE IF EXISTS children 
    ALTER COLUMN household_id TYPE text USING household_id::text;
  
  -- Add a foreign key constraint if it doesn't exist
  -- Use a DO block to conditionally add the constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'children_household_id_fkey' 
    AND conrelid = 'children'::regclass
  ) THEN
    -- Add a foreign key constraint to households
    -- But make it deferrable to handle potential import edge cases
    ALTER TABLE children
      ADD CONSTRAINT children_household_id_fkey
      FOREIGN KEY (household_id) REFERENCES households(household_id)
      ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    
    RAISE NOTICE 'Added foreign key constraint to children.household_id';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists on children.household_id';
  END IF;
  
END$$;

COMMIT;

-- Migration: Fix children table household_id column 
-- This migration ensures the children table exists with a household_id column of text type
-- and properly references the households table's household_id column

BEGIN;

-- First, make sure the households table exists
CREATE TABLE IF NOT EXISTS households (
  household_id text PRIMARY KEY,
  external_id text,
  created_at timestamptz DEFAULT now(),
  household_name text,
  address text,
  city text,
  state text,
  zip text,
  primary_phone text,
  email text,
  preferred_scripture_translation text
);

-- Then make sure the children table exists with the right schema
CREATE TABLE IF NOT EXISTS children (
  child_id text PRIMARY KEY,
  external_id text,
  household_id text,
  external_household_id text,
  first_name text,
  last_name text,
  birth_date date,
  gender text,
  mobile_phone text,
  allergies text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Check if we need to update the household_id column
DO $$
BEGIN
  -- If the table exists but the column doesn't, add it
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'children') 
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns 
       WHERE table_name = 'children' AND column_name = 'household_id'
     ) 
  THEN
    -- Add the column as text type
    ALTER TABLE children ADD COLUMN household_id text;
    
    -- Update it with values from external_household_id if available
    UPDATE children 
    SET household_id = external_household_id 
    WHERE external_household_id IS NOT NULL;
    
    RAISE NOTICE 'Added missing household_id column to children table';
  ELSE
    RAISE NOTICE 'children.household_id column already exists or table was just created';
  END IF;
  
  -- Ensure the column is of text type (not uuid) if it exists
  -- Use IF EXISTS to avoid errors in fresh installs
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'household_id') THEN
    -- Safe type conversion with additional checks
    BEGIN
      ALTER TABLE children 
        ALTER COLUMN household_id TYPE text USING household_id::text;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not convert household_id to text: %', SQLERRM;
    END;
  END IF;
  
  -- Add a foreign key constraint if the tables exist and the constraint doesn't
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'children')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'households')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'household_id')
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint 
       WHERE conname = 'children_household_id_fkey' 
       AND conrelid = 'children'::regclass
     ) 
  THEN
    BEGIN
      -- Add a foreign key constraint to households
      -- But make it deferrable to handle potential import edge cases
      ALTER TABLE children
        ADD CONSTRAINT children_household_id_fkey
        FOREIGN KEY (household_id) REFERENCES households(household_id)
        ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
      
      RAISE NOTICE 'Added foreign key constraint to children.household_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add foreign key constraint: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists or could not be added';
  END IF;
  
END$$;

-- Fix the specific issue mentioned in the error
DO $$
BEGIN
  -- Make sure we don't try to drop defaults on non-existent columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'children' 
    AND column_name = 'household_id'
    AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE IF EXISTS children ALTER COLUMN household_id DROP DEFAULT;
    RAISE NOTICE 'Dropped default value from children.household_id';
  END IF;
END$$;

COMMIT;

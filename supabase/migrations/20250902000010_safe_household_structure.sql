-- Migration: Safely fix household_id issues
-- This migration handles the case where household_id might not exist in the children table

BEGIN;

-- First, ensure the base tables exist
CREATE TABLE IF NOT EXISTS households (
  household_id text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

-- Check if the children table exists before attempting any operations
DO $$
DECLARE
  table_exists boolean;
  column_exists boolean;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'children'
  ) INTO table_exists;

  IF NOT table_exists THEN
    -- Create the table if it doesn't exist
    CREATE TABLE children (
      child_id text PRIMARY KEY,
      household_id text,
      first_name text,
      last_name text,
      birth_date date,
      created_at timestamptz DEFAULT now()
    );
    RAISE NOTICE 'Created children table';
  ELSE
    -- Check if the household_id column exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'children' AND column_name = 'household_id'
    ) INTO column_exists;

    IF NOT column_exists THEN
      -- Add the column if it doesn't exist
      ALTER TABLE children ADD COLUMN household_id text;
      RAISE NOTICE 'Added missing household_id column to children table';
    END IF;
  END IF;
  
  -- Create foreign key constraints if needed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'children_household_id_fkey'
  ) THEN
    -- Check if both tables and columns exist before creating the constraint
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'children' AND column_name = 'household_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'households'
    ) THEN
      BEGIN
        ALTER TABLE children 
          ADD CONSTRAINT children_household_id_fkey 
          FOREIGN KEY (household_id) REFERENCES households(household_id);
        RAISE NOTICE 'Added foreign key constraint children_household_id_fkey';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add foreign key constraint: %', SQLERRM;
      END;
    END IF;
  END IF;

END $$;

-- Do the same for guardians
DO $$
DECLARE
  table_exists boolean;
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'guardians'
  ) INTO table_exists;

  IF table_exists THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'guardians' AND column_name = 'household_id'
    ) INTO column_exists;

    IF NOT column_exists THEN
      ALTER TABLE guardians ADD COLUMN household_id text;
      RAISE NOTICE 'Added missing household_id column to guardians table';
    END IF;
    
    -- Add constraint if needed
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'guardians_household_id_fkey'
    ) THEN
      BEGIN
        ALTER TABLE guardians 
          ADD CONSTRAINT guardians_household_id_fkey 
          FOREIGN KEY (household_id) REFERENCES households(household_id);
        RAISE NOTICE 'Added foreign key constraint guardians_household_id_fkey';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add foreign key constraint: %', SQLERRM;
      END;
    END IF;
  END IF;
END $$;

-- Fix emergency_contacts if needed
DO $$
DECLARE
  table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'emergency_contacts'
  ) INTO table_exists;

  IF table_exists THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_emergency_contacts_household'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'emergency_contacts' AND column_name = 'household_id'
    ) THEN
      BEGIN
        ALTER TABLE emergency_contacts 
          ADD CONSTRAINT fk_emergency_contacts_household 
          FOREIGN KEY (household_id) REFERENCES households(household_id);
        RAISE NOTICE 'Added foreign key constraint fk_emergency_contacts_household';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add foreign key constraint: %', SQLERRM;
      END;
    END IF;
  END IF;
END $$;

COMMIT;

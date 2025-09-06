-- Migration: Add missing fields to scriptures table to match Scripture interface
-- Adds: scripture_number, scripture_order, counts_for, category

BEGIN;

-- Check if the scriptures table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scriptures') THEN
    
    RAISE NOTICE 'Adding missing fields to scriptures table';
    
    -- Add scripture_number field (string, e.g., "1-2")
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'scriptures' 
      AND column_name = 'scripture_number'
    ) THEN
      ALTER TABLE scriptures ADD COLUMN scripture_number text;
      RAISE NOTICE 'Added scripture_number column';
    ELSE
      RAISE NOTICE 'scripture_number column already exists';
    END IF;
    
    -- Add scripture_order field (number, controls display & min cut-offs)
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'scriptures' 
      AND column_name = 'scripture_order'
    ) THEN
      ALTER TABLE scriptures ADD COLUMN scripture_order integer;
      RAISE NOTICE 'Added scripture_order column';
    ELSE
      RAISE NOTICE 'scripture_order column already exists';
    END IF;
    
    -- Add counts_for field (number, how many this entry counts for)
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'scriptures' 
      AND column_name = 'counts_for'
    ) THEN
      ALTER TABLE scriptures ADD COLUMN counts_for integer;
      RAISE NOTICE 'Added counts_for column';
    ELSE
      RAISE NOTICE 'counts_for column already exists';
    END IF;
    
    -- Add category field (string, e.g., "Primary Minimum", "Competition")
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'scriptures' 
      AND column_name = 'category'
    ) THEN
      ALTER TABLE scriptures ADD COLUMN category text;
      RAISE NOTICE 'Added category column';
    ELSE
      RAISE NOTICE 'category column already exists';
    END IF;
    
    RAISE NOTICE 'Successfully added missing scripture fields';
    
  ELSE
    RAISE NOTICE 'scriptures table does not exist, no changes needed';
  END IF;
END $$;

COMMIT;
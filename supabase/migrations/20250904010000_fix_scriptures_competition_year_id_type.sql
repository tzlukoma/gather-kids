-- Migration: Fix scriptures.competition_year_id column type to match competition_years.id

BEGIN;

-- Check if the scriptures table exists and if competition_year_id column is uuid type
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Only proceed if the scriptures table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scriptures') THEN
    
    -- Check if the competition_year_id column is currently uuid type
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'scriptures' 
      AND column_name = 'competition_year_id' 
      AND data_type = 'uuid'
    ) THEN
      
      RAISE NOTICE 'Converting scriptures.competition_year_id from uuid to text';
      
      -- Drop any foreign key constraints referencing this column
      FOR constraint_name IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'scriptures'
        AND kcu.column_name = 'competition_year_id'
        AND tc.constraint_type = 'FOREIGN KEY'
      LOOP
        EXECUTE 'ALTER TABLE scriptures DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped foreign key constraint: %', constraint_name;
      END LOOP;
      
      -- Drop and recreate the column as text
      ALTER TABLE scriptures DROP COLUMN competition_year_id;
      ALTER TABLE scriptures ADD COLUMN competition_year_id text;
      
      RAISE NOTICE 'Successfully converted scriptures.competition_year_id to text type';
      
    ELSE
      RAISE NOTICE 'scriptures.competition_year_id is already text type or does not exist, no changes needed';
    END IF;
    
  ELSE
    RAISE NOTICE 'scriptures table does not exist, no changes needed';
  END IF;
END $$;

COMMIT;
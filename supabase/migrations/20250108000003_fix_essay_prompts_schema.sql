-- Migration: Fix essay_prompts table schema to match application interface
-- This updates the table to use the correct fields that the application expects

BEGIN;

-- Check if the table exists and has the old schema
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'essay_prompts') THEN
    
    -- Check if we have the old schema (with division_id, title, prompt)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_prompts' AND column_name = 'division_id') THEN
      
      -- Add missing columns for the new schema
      ALTER TABLE essay_prompts ADD COLUMN IF NOT EXISTS division_name text;
      ALTER TABLE essay_prompts ADD COLUMN IF NOT EXISTS prompt_text text;
      ALTER TABLE essay_prompts ADD COLUMN IF NOT EXISTS due_date timestamptz;
      ALTER TABLE essay_prompts ADD COLUMN IF NOT EXISTS year_id text;
      ALTER TABLE essay_prompts ADD COLUMN IF NOT EXISTS bible_bee_cycle_id uuid;
      
      -- Migrate data from old schema to new schema
      UPDATE essay_prompts SET 
        prompt_text = COALESCE(prompt, ''),
        division_name = COALESCE(title, ''),
        due_date = COALESCE(created_at, now()),
        year_id = 'legacy'
      WHERE prompt_text IS NULL OR prompt_text = '';
      
      -- Make the new required columns NOT NULL after migration
      ALTER TABLE essay_prompts ALTER COLUMN prompt_text SET NOT NULL;
      ALTER TABLE essay_prompts ALTER COLUMN due_date SET NOT NULL;
      
      RAISE NOTICE 'Migrated essay_prompts table from old schema to new schema';
      
    END IF;
    
    -- Check if we have the new schema but missing some columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_prompts' AND column_name = 'division_name') THEN
      ALTER TABLE essay_prompts ADD COLUMN division_name text;
      RAISE NOTICE 'Added division_name column to essay_prompts';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_prompts' AND column_name = 'prompt_text') THEN
      ALTER TABLE essay_prompts ADD COLUMN prompt_text text;
      RAISE NOTICE 'Added prompt_text column to essay_prompts';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_prompts' AND column_name = 'due_date') THEN
      ALTER TABLE essay_prompts ADD COLUMN due_date timestamptz;
      RAISE NOTICE 'Added due_date column to essay_prompts';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_prompts' AND column_name = 'year_id') THEN
      ALTER TABLE essay_prompts ADD COLUMN year_id text;
      RAISE NOTICE 'Added year_id column to essay_prompts';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_prompts' AND column_name = 'bible_bee_cycle_id') THEN
      ALTER TABLE essay_prompts ADD COLUMN bible_bee_cycle_id uuid;
      RAISE NOTICE 'Added bible_bee_cycle_id column to essay_prompts';
    END IF;
    
  ELSE
    -- Create the table with the correct schema if it doesn't exist
    CREATE TABLE essay_prompts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      year_id text,
      bible_bee_cycle_id uuid,
      division_name text,
      prompt_text text NOT NULL,
      due_date timestamptz NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    
    RAISE NOTICE 'Created essay_prompts table with correct schema';
  END IF;
END $$;

COMMIT;

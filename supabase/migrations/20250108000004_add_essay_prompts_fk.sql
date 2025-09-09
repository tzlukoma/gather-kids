-- Migration: Add foreign key constraint for essay_prompts.bible_bee_cycle_id
-- This should run after the bible_bee_cycles table is created

BEGIN;

-- Add foreign key constraint for bible_bee_cycle_id if the bible_bee_cycles table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bible_bee_cycles') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_prompts' AND column_name = 'bible_bee_cycle_id') THEN
    
    -- Drop existing constraint if it exists
    ALTER TABLE essay_prompts DROP CONSTRAINT IF EXISTS essay_prompts_bible_bee_cycle_id_fkey;
    
    -- Add the foreign key constraint
    ALTER TABLE essay_prompts ADD CONSTRAINT essay_prompts_bible_bee_cycle_id_fkey 
      FOREIGN KEY (bible_bee_cycle_id) REFERENCES bible_bee_cycles(id);
    
    RAISE NOTICE 'Added foreign key constraint for essay_prompts.bible_bee_cycle_id';
  END IF;
END $$;

COMMIT;
